-- Enable pg_net extension for outbound HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.notify_critical_prediction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
  request_body jsonb;
BEGIN
  IF NEW.severity = 'Critical' THEN
    -- Build the JSON payload
    request_body := jsonb_build_object(
      'prediction_id', NEW.id,
      'patient_id', NEW.patient_id
    );

    -- Attempt to get settings from current_setting (these can be set per environment)
    -- Fallback to local dev defaults
    edge_function_url := coalesce(
      current_setting('app.settings.edge_function_base_url', true), 
      'http://host.docker.internal:54321/functions/v1'
    ) || '/send-alert';
    
    service_role_key := coalesce(
      current_setting('app.settings.service_role_key', true), 
      'LOCAL_SERVICE_ROLE_KEY'
    );

    -- Dispatch asynchronous HTTP POST request via pg_net
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := request_body
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on the predictions table
DROP TRIGGER IF EXISTS trigger_notify_critical_prediction ON public.predictions;
CREATE TRIGGER trigger_notify_critical_prediction
AFTER INSERT ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.notify_critical_prediction();
