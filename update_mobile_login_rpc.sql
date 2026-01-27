-- Actualizar función RPC mobile_login para validar permisos de rol dinámicamente
CREATE OR REPLACE FUNCTION public.mobile_login(dni_input text, password_input text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  found_user public.employees%ROWTYPE;
  found_role public.roles%ROWTYPE;
  response json;
BEGIN
  -- 1. Buscar usuario por DNI
  SELECT * INTO found_user
  FROM public.employees
  WHERE dni = dni_input
  LIMIT 1;

  -- 2. Validar existencia
  IF found_user IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no encontrado');
  END IF;

  -- 3. Validar contraseña
  -- Intento 3: Si fallaron 'password_hash' y 'password', es posible que se llame 'password_encrypted'
  -- O que no estemos accediendo bien al campo.
  -- Vamos a usar una lógica dinámica o probar el nombre más común en sistemas legacy.
  -- Según tu error anterior: "record found_user has no field password"
  -- Esto es muy extraño si la tabla tiene una columna de contraseña.
  -- ¿Podría ser que la variable found_user NO tiene la columna porque el SELECT * INTO a veces es tricky con tipos ROW?
  -- Vamos a cambiar la estrategia: SELECT directo del campo contraseña.
  
  DECLARE
     stored_password text;
   BEGIN
       -- CORRECCIÓN FINAL: El nombre real de la columna según el DDL es 'app_password'
       SELECT app_password INTO stored_password FROM public.employees WHERE dni = dni_input;
       
       IF stored_password IS DISTINCT FROM password_input THEN
          RETURN json_build_object('success', false, 'message', 'Contraseña incorrecta');
       END IF;
   END;

  -- 4. Validar ROL y PERMISO MÓVIL
  -- Si el usuario tiene un role_id, verificamos los permisos
  IF found_user.role_id IS NOT NULL THEN
      SELECT * INTO found_role FROM public.roles WHERE id = found_user.role_id;
      
      IF found_role IS NOT NULL THEN
          -- Verificar permiso explícito
          IF found_role.mobile_access IS FALSE THEN
              RETURN json_build_object('success', false, 'message', 'Acceso denegado: Tu rol (' || found_role.name || ') no tiene permiso para usar la App Móvil.');
          END IF;
      END IF;
  ELSE
      -- Fallback para usuarios legacy sin rol asignado (Opcional: permitir o denegar)
      -- Por seguridad, si implementamos roles, mejor denegar si no tiene rol, o permitir por defecto.
      -- Permitiremos por defecto SOLO si no tiene rol, para no bloquear a nadie durante la migración
      NULL; 
  END IF;

  -- 5. Construir respuesta exitosa incluyendo info del rol
  response := json_build_object(
    'success', true,
    'employee_id', found_user.id,
    'full_name', found_user.full_name,
    'dni', found_user.dni,
    'employee_type', found_user.employee_type, -- Mantener compatibilidad
    'position', found_user.position,
    'sede', found_user.sede,
    'business_unit', found_user.business_unit,
    'profile_picture_url', found_user.profile_picture_url,
    'role', found_role.name, -- Nombre del rol para el frontend
    'mobile_access', COALESCE(found_role.mobile_access, true) -- Enviar permiso explícito
  );

  RETURN response;
END;
$function$;
