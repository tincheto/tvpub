# TVPub - Sistema de Publicidad para TV

Aplicación web para gestionar publicidad entre comercios y anunciantes, diseñada para ser convertida en una app de Android TV.

## Características

- 🔐 Autenticación con Supabase
- 👥 Dos tipos de usuarios: Comercio y Anunciante
- 📱 Código QR para propuestas de publicidad
- ✅ Sistema de aprobación/rechazo de propuestas
- 📺 Visualización de publicidad aceptada

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 3. Configurar la base de datos

1. Ve al SQL Editor en tu proyecto de Supabase
2. Copia y ejecuta el contenido del archivo `supabase-setup.sql` que está en la raíz del proyecto

O ejecuta estos SQL manualmente:

```sql
-- Tabla de perfiles de usuario
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('comercio', 'anunciante')),
  nombre TEXT,
  comercio_id UUID REFERENCES comercios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comercios
CREATE TABLE comercios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de anunciantes
CREATE TABLE anunciantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de propuestas
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id UUID NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  anunciante_id UUID NOT NULL REFERENCES anunciantes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  imagen_url TEXT,
  video_url TEXT,
  duracion_segundos INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear bucket de almacenamiento para publicidad
-- NOTA: Esto debe hacerse desde la interfaz de Storage de Supabase:
-- 1. Ve a Storage en el menú lateral
-- 2. Crea un nuevo bucket llamado "publicidad"
-- 3. Márcalo como público

-- Políticas de seguridad (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anunciantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para comercios
CREATE POLICY "Users can view own comercio" ON comercios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own comercio" ON comercios FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para anunciantes
CREATE POLICY "Users can view own anunciante" ON anunciantes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own anunciante" ON anunciantes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para proposals
CREATE POLICY "Comercios can view their proposals" ON proposals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM comercios WHERE comercios.id = proposals.comercio_id AND comercios.user_id = auth.uid()
  )
);
CREATE POLICY "Anunciantes can view their proposals" ON proposals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM anunciantes WHERE anunciantes.id = proposals.anunciante_id AND anunciantes.user_id = auth.uid()
  )
);
CREATE POLICY "Anunciantes can create proposals" ON proposals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM anunciantes WHERE anunciantes.id = proposals.anunciante_id AND anunciantes.user_id = auth.uid()
  )
);
CREATE POLICY "Comercios can update their proposals" ON proposals FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM comercios WHERE comercios.id = proposals.comercio_id AND comercios.user_id = auth.uid()
  )
);
```

### 4. Configurar Storage en Supabase

1. Ve a **Storage** en el menú lateral de Supabase
2. Crea un nuevo bucket llamado `publicidad`
3. Márcalo como **público** (public bucket)
4. Configura las políticas de acceso según necesites

### 5. Ejecutar la aplicación

```bash
npm run dev
```

## Uso

1. **Registro/Login**: Los usuarios pueden registrarse como Comercio o Anunciante
2. **Comercio**: Al iniciar sesión, verá un código QR que puede compartir con anunciantes
3. **Anunciante**: Puede escanear el QR o acceder directamente a la URL para hacer una propuesta
4. **Gestión**: El comercio puede aceptar o rechazar propuestas
5. **Visualización**: 
   - Cuando se acepta una propuesta, la publicidad se muestra automáticamente
   - La publicidad se muestra durante el tiempo especificado (duración en segundos)
   - Después de que termine el tiempo, automáticamente vuelve a mostrar el QR
   - Solo se muestra la publicidad activa, el resto del tiempo se muestra el QR

## Estructura del Proyecto

```
tvpub/
├── src/
│   ├── components/       # Componentes reutilizables
│   ├── contexts/         # Contextos de React (Auth)
│   ├── lib/              # Configuración de Supabase
│   ├── pages/            # Páginas de la aplicación
│   ├── types/            # Tipos TypeScript
│   ├── App.tsx           # Componente principal
│   └── main.tsx          # Punto de entrada
├── supabase-setup.sql    # Script SQL para configurar la BD
└── package.json
```

## Conversión a Android TV

Para convertir esta app a Android TV:

1. **Usa Capacitor o React Native**: 
   - Capacitor es más fácil si ya tienes una web app
   - React Native requiere más refactorización pero ofrece mejor rendimiento

2. **Adapta la UI para TV**:
   - Implementa navegación con D-pad/control remoto
   - Aumenta el tamaño de los elementos interactivos
   - Usa focus states visibles para navegación por teclado

3. **Optimiza para pantallas grandes**:
   - Diseña para resolución 4K
   - Usa fuentes más grandes
   - Aumenta el espaciado entre elementos

4. **Implementa autoplay**:
   - Videos y animaciones deben reproducirse automáticamente
   - Considera un modo "kiosco" para mostrar publicidad continuamente

5. **Consideraciones de rendimiento**:
   - Optimiza imágenes y videos
   - Implementa lazy loading
   - Cachea contenido cuando sea posible
