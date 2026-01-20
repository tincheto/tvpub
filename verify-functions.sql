-- Script para verificar que las funciones existen y tienen los permisos correctos

-- Verificar que las funciones existen
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('create_comercio', 'create_anunciante', 'create_user_profile')
ORDER BY routine_name;

-- Verificar permisos de las funciones
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('create_comercio', 'create_anunciante', 'create_user_profile');

-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'comercios', 'anunciantes', 'proposals')
ORDER BY table_name;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'comercios', 'anunciantes', 'proposals')
ORDER BY tablename, policyname;
