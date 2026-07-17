-- Assign local public product images to existing demo products.
-- This preserves uploaded Supabase Storage URLs and only fills missing/invalid local values.

WITH image_map(name_key, image_url) AS (
  VALUES
    ('americano', '/assets/products/coffee/americano.webp'),
    ('cappuccino', '/assets/products/coffee/cappuccino.webp'),
    ('espresso', '/assets/products/coffee/espresso.webp'),
    ('green tea', '/assets/products/coffee/green-tea.webp'),
    ('latte', '/assets/products/coffee/latte.webp'),
    ('blueberry muffin', '/assets/products/desserts/blueberry-muffin.webp'),
    ('brownie', '/assets/products/desserts/brownie.webp'),
    ('cheesecake', '/assets/products/desserts/cheesecake.webp'),
    ('chai latte', '/assets/products/tea/chai-latte.webp'),
    ('cold brew', '/assets/products/tea/cold-brew.webp'),
    ('lemon tea', '/assets/products/tea/lemon-tea.webp'),
    ('cookie', '/assets/products/bakery/cookie.webp'),
    ('croissant', '/assets/products/bakery/croissant.web.jpg'),
    ('french fries', '/assets/products/snacks/french-fries.webp'),
    ('sandwich', '/assets/products/snacks/sandwich.webp'),
    ('wrap', '/assets/products/snacks/wrap.webp')
)
UPDATE public.products AS p
SET image_url = image_map.image_url
FROM image_map
WHERE lower(trim(p.name)) = image_map.name_key
  AND (
    p.image_url IS NULL
    OR trim(p.image_url) = ''
    OR (
      p.image_url NOT LIKE 'http://%'
      AND p.image_url NOT LIKE 'https://%'
    )
  );

-- Find remaining invalid local/browser paths.
SELECT
  id,
  name,
  image_url
FROM public.products
WHERE image_url IS NOT NULL
  AND trim(image_url) <> ''
  AND image_url NOT LIKE '/%'
  AND image_url NOT LIKE 'http://%'
  AND image_url NOT LIKE 'https://%';
