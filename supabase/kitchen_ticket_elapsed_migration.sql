-- Brew Bar elapsed-time fix for existing Supabase projects.
-- Apply after the base OdFe schema exists.

ALTER TABLE public.kitchen_tickets
  ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;

ALTER TABLE public.kitchen_tickets
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.advance_kitchen_ticket(
  p_ticket_id UUID,
  p_order_id UUID,
  p_next_stage public.kitchen_stage,
  p_previous_stage public.kitchen_stage
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cafe_id UUID;
  v_current_stage public.kitchen_stage;
  v_role TEXT;
BEGIN
  SELECT kt.cafe_id, kt.stage
    INTO v_cafe_id, v_current_stage
  FROM public.kitchen_tickets kt
  WHERE kt.id = p_ticket_id
    AND kt.order_id = p_order_id;

  IF v_cafe_id IS NULL THEN
    RAISE EXCEPTION 'Kitchen ticket not found';
  END IF;

  SELECT p.role::text
    INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.cafe_id = v_cafe_id
    AND p.is_active = true
  LIMIT 1;

  IF v_role NOT IN ('admin', 'kitchen') THEN
    RAISE EXCEPTION 'Kitchen access required';
  END IF;

  IF v_current_stage <> p_previous_stage THEN
    RAISE EXCEPTION 'Kitchen ticket stage changed. Refresh and try again.';
  END IF;

  IF p_previous_stage = 'to_cook' AND p_next_stage = 'preparing' THEN
    UPDATE public.kitchen_tickets
    SET
      stage = 'preparing',
      preparing_at = COALESCE(preparing_at, now()),
      updated_at = now()
    WHERE id = p_ticket_id;

    UPDATE public.orders
    SET
      status = 'preparing',
      updated_at = now()
    WHERE id = p_order_id
      AND cafe_id = v_cafe_id;

    RETURN;
  END IF;

  IF p_previous_stage = 'preparing' AND p_next_stage = 'completed' THEN
    UPDATE public.kitchen_tickets
    SET
      stage = 'completed',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
    WHERE id = p_ticket_id;

    UPDATE public.orders
    SET
      status = 'completed',
      updated_at = now()
    WHERE id = p_order_id
      AND cafe_id = v_cafe_id;

    RETURN;
  END IF;

  RAISE EXCEPTION 'Invalid kitchen ticket stage transition';
END;
$$;
