UPDATE "shipping_method_translations" AS smt
SET
  "name" = v.name,
  "eta_label" = v.eta_label,
  "note" = v.note,
  "updated_at" = now()
FROM "shipping_methods" AS sm,
LATERAL (
  VALUES
    ('dhl-express', 'DHL Express', '2-5 business days', 'Ideal for samples, urgent orders, and spare parts.'),
    ('fedex-priority', 'FedEx Priority', '3-6 business days', 'Ideal for international commercial shipments that need more predictable customs visibility.'),
    ('ups-worldwide', 'UPS Worldwide', '3-7 business days', 'Ideal for warehouses and import channels with an existing UPS receiving preference.'),
    ('sea-lcl', 'Sea-LCL', '18-28 days', 'Ideal for heavier freight and replenishment focused on landed cost.'),
    ('warehouse-pickup', 'Warehouse Pickup', 'By appointment', 'Ideal when freight forwarding or local pickup has already been arranged.')
) AS v(code, name, eta_label, note)
WHERE sm."id" = smt."shipping_method_id"
  AND sm."code" = v.code
  AND smt."locale" = 'en';
