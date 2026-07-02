UPDATE "commerce_settings"
SET
  "shipping_country_rates" = (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN elem->>'note' = '美国主力快递方案。' THEN jsonb_set(elem, '{note}', '"Primary express option for the United States."')
        WHEN elem->>'note' = '适合北美商务交付。' THEN jsonb_set(elem, '{note}', '"Suitable for North American business deliveries."')
        WHEN elem->>'note' = '低时效拼箱方案。' THEN jsonb_set(elem, '{note}', '"Lower-cost LCL option with extended transit time."')
        WHEN elem->>'note' = '自提不收取平台运费。' THEN jsonb_set(elem, '{note}', '"No platform shipping fee for warehouse pickup."')
        WHEN elem->>'note' = '欧盟常用快递方案。' THEN jsonb_set(elem, '{note}', '"Primary express option for the European Union."')
        WHEN elem->>'note' = '默认出口快递方案。' THEN jsonb_set(elem, '{note}', '"Default export express lane."')
        ELSE elem
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements("shipping_country_rates") AS elem
  ),
  "updated_at" = now()
WHERE "id" = 'default';
