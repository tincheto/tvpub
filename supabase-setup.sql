-- ============================================
-- TVPub - Configuración de Base de Datos
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Tabla de comercios (debe crearse primero porque user_profiles la referencia)
CREATE TABLE IF NOT EXISTS comercios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de anunciantes
CREATE TABLE IF NOT EXISTS anunciantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de perfiles de usuario (se crea después de comercios para poder referenciarla)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('comercio', 'anunciante')),
  nombre TEXT,
  comercio_id UUID REFERENCES comercios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de propuestas (se crea después de comercios y anunciantes)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  anunciante_id UUID NOT NULL REFERENCES anunciantes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  imagen_url TEXT,
  video_url TEXT,
  duracion_segundos INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear bucket de almacenamiento para publicidad
-- Nota: Esto debe hacerse desde la interfaz de Storage de Supabase o ejecutarse manualmente
-- INSERT INTO storage.buckets (id, name, public) VALUES ('publicidad', 'publicidad', true);

-- 6. Habilitar Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anunciantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de seguridad para user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- 8. Políticas para comercios
DROP POLICY IF EXISTS "Users can view own comercio" ON comercios;
CREATE POLICY "Users can view own comercio" ON comercios 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own comercio" ON comercios;
-- Permitir inserción cuando el user_id coincide con el usuario autenticado
CREATE POLICY "Users can insert own comercio" ON comercios 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir que los usuarios vean todos los comercios (necesario para el QR)
DROP POLICY IF EXISTS "Comercios can view all" ON comercios;
CREATE POLICY "Comercios can view all" ON comercios 
  FOR SELECT USING (true);

-- 9. Políticas para anunciantes
DROP POLICY IF EXISTS "Users can view own anunciante" ON anunciantes;
CREATE POLICY "Users can view own anunciante" ON anunciantes 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own anunciante" ON anunciantes;
CREATE POLICY "Users can insert own anunciante" ON anunciantes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Políticas para proposals
DROP POLICY IF EXISTS "Comercios can view their proposals" ON proposals;
CREATE POLICY "Comercios can view their proposals" ON proposals 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comercios 
      WHERE comercios.id = proposals.comercio_id 
      AND comercios.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anunciantes can view their proposals" ON proposals;
CREATE POLICY "Anunciantes can view their proposals" ON proposals 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM anunciantes 
      WHERE anunciantes.id = proposals.anunciante_id 
      AND anunciantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anunciantes can create proposals" ON proposals;
CREATE POLICY "Anunciantes can create proposals" ON proposals 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM anunciantes 
      WHERE anunciantes.id = proposals.anunciante_id 
      AND anunciantes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Comercios can update their proposals" ON proposals;
CREATE POLICY "Comercios can update their proposals" ON proposals 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM comercios 
      WHERE comercios.id = proposals.comercio_id 
      AND comercios.user_id = auth.uid()
    )
  );

-- 11. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Trigger para actualizar updated_at en proposals
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 13. Función helper para crear comercio (con SECURITY DEFINER para evitar problemas de RLS)
-- Verifica que el user_id existe en auth.users antes de insertar
CREATE OR REPLACE FUNCTION create_comercio(p_nombre TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comercio_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar que el usuario existe en auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  INSERT INTO comercios (nombre, user_id)
  VALUES (p_nombre, p_user_id)
  RETURNING id INTO v_comercio_id;
  
  RETURN v_comercio_id;
END;
$$;

-- 14. Función helper para crear anunciante (con SECURITY DEFINER para evitar problemas de RLS)
-- Verifica que el user_id existe en auth.users antes de insertar
CREATE OR REPLACE FUNCTION create_anunciante(p_nombre TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anunciante_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar que el usuario existe en auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  INSERT INTO anunciantes (nombre, user_id)
  VALUES (p_nombre, p_user_id)
  RETURNING id INTO v_anunciante_id;
  
  RETURN v_anunciante_id;
END;
$$;

-- 15. Función helper para crear perfil de usuario (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_role TEXT,
  p_nombre TEXT,
  p_comercio_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar que el usuario existe en auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Verificar que el rol es válido
  IF p_role NOT IN ('comercio', 'anunciante') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  
  INSERT INTO user_profiles (user_id, role, nombre, comercio_id)
  VALUES (p_user_id, p_role, p_nombre, p_comercio_id)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role,
      nombre = EXCLUDED.nombre,
      comercio_id = EXCLUDED.comercio_id;
END;
$$;

-- 16. Otorgar permisos de ejecución a las funciones
GRANT EXECUTE ON FUNCTION create_comercio(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_comercio(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION create_anunciante(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_anunciante(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, UUID) TO anon;

-- 17. Políticas de Storage para el bucket "publicidad"
-- Nota: Estas políticas se aplican a la tabla storage.objects

-- Permitir que todos los usuarios autenticados puedan subir archivos al bucket publicidad
DROP POLICY IF EXISTS "Anunciantes can upload files" ON storage.objects;
CREATE POLICY "Anunciantes can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'publicidad' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'anunciante'
  )
);

-- Permitir que todos puedan leer archivos del bucket publicidad (bucket público)
DROP POLICY IF EXISTS "Public can read publicidad files" ON storage.objects;
CREATE POLICY "Public can read publicidad files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'publicidad');

-- Permitir que los anunciantes puedan actualizar sus propios archivos
DROP POLICY IF EXISTS "Anunciantes can update own files" ON storage.objects;
CREATE POLICY "Anunciantes can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'publicidad' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'anunciante'
  )
)
WITH CHECK (
  bucket_id = 'publicidad' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'anunciante'
  )
);

-- Permitir que los anunciantes puedan eliminar sus propios archivos
DROP POLICY IF EXISTS "Anunciantes can delete own files" ON storage.objects;
CREATE POLICY "Anunciantes can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'publicidad' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'anunciante'
  )
);