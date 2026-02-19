-- SCRIPT DE DIAGNÓSTICO PARA CONTADORES EN CERO
-- Ejecuta esto en el Editor SQL de Supabase para ver qué está pasando internamente

DO $$
DECLARE
    v_today date;
    v_count_raw int;
    v_count_timezone int;
    v_server_now timestamptz;
    v_peru_now timestamptz;
BEGIN
    v_server_now := now();
    v_peru_now := now() AT TIME ZONE 'America/Lima';
    v_today := (now() AT TIME ZONE 'America/Lima')::date;

    RAISE NOTICE '--- DIAGNÓSTICO DE FECHAS ---';
    RAISE NOTICE 'Server Now (UTC): %', v_server_now;
    RAISE NOTICE 'Peru Now: %', v_peru_now;
    RAISE NOTICE 'Fecha Usada para Filtro (v_today): %', v_today;

    -- 1. Contar asistencias totales sin filtro de fecha
    SELECT COUNT(*) INTO v_count_raw FROM public.attendance;
    RAISE NOTICE 'Total Asistencias en tabla (Histórico): %', v_count_raw;

    -- 2. Contar asistencias para la fecha de "hoy" (según Perú)
    SELECT COUNT(*) INTO v_count_timezone 
    FROM public.attendance 
    WHERE work_date = v_today;
    
    RAISE NOTICE 'Asistencias con work_date = % (Hoy Perú): %', v_today, v_count_timezone;

    -- 3. Ver últimas 5 fechas registradas para entender si hay datos recientes
    RAISE NOTICE '--- ÚLTIMAS 5 FECHAS REGISTRADAS ---';
    FOR v_today IN SELECT work_date FROM public.attendance ORDER BY created_at DESC LIMIT 5 LOOP
        RAISE NOTICE 'Fecha: %', v_today;
    END LOOP;
END $$;
