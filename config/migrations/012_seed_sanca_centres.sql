-- Migration 012: Seed SANCA centre registry (30 member organisations)
-- Data sourced from SANCA network as of June 2026
-- Note: satellites/affiliates linked in migration 013 via member_org_id

INSERT INTO centres (name, province, city, intake_email, bed_type, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
VALUES

-- GAUTENG (12)
('SANCA Horizon Centre', 'Gauteng', 'Boksburg', 'intake@sanca-horizon-centre.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('Elim Clinic', 'Gauteng', 'Kempton Park', 'intake@elim-clinic.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Nishtara', 'Gauteng', 'Lenasia', 'intake@sanca-nishtara.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('Wedge Gardens', 'Gauteng', 'Lyndhurst', 'intake@wedge-gardens.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('Stabilis', 'Gauteng', 'Pretoria', 'reception@stabilistc.co.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Castle Carey', 'Gauteng', 'Pretoria North', 'intake@sanca-castle-carey.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Eastern Gauteng', 'Gauteng', 'Boksburg', 'intake@sanca-eastern-gauteng.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Greater Heidelberg', 'Gauteng', 'Heidelberg', 'intake@sanca-greater-heidelberg.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Central Rand', 'Gauteng', 'Johannesburg', 'intake@sanca-central-rand.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Soweto', 'Gauteng', 'Soweto', 'intake@sanca-soweto.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Thusong', 'Gauteng', 'Pretoria', 'intake@sanca-thusong.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Vaal Triangle', 'Gauteng', 'Vanderbijlpark', 'intake@sanca-vaal-triangle.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),

-- KWAZULU-NATAL (5)
('SANCA Durban', 'KwaZulu-Natal', 'Durban', 'intake@sanca-durban.sanca.org.za', ARRAY['inpatient', 'outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Newcastle', 'KwaZulu-Natal', 'Newcastle', 'intake@sanca-newcastle.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Zululand', 'KwaZulu-Natal', 'Empangeni', 'intake@sanca-zululand.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA PMB', 'KwaZulu-Natal', 'Pietermaritzburg', 'intake@sanca-pmb.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Nongoma', 'KwaZulu-Natal', 'Nongoma', 'intake@sanca-nongoma.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),

-- MPUMALANGA (3)
('SANCA Lowveld', 'Mpumalanga', 'Nelspruit', 'intake@sanca-lowveld.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Witbank', 'Mpumalanga', 'Witbank', 'intake@sanca-witbank.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Thembisile', 'Mpumalanga', 'Kwaggafontein', 'intake@sanca-thembisile.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),

-- FREE STATE (3)
('SANCA Aurora', 'Free State', 'Bloemfontein', 'intake@sanca-aurora.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Goldfields', 'Free State', 'Welkom', 'intake@sanca-goldfields.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Sasolburg', 'Free State', 'Sasolburg', 'intake@sanca-sasolburg.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),

-- WESTERN CAPE (4)
('Ramot Treatment Centre', 'Western Cape', 'Parow East', 'intake@ramot-treatment-centre.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Western Cape', 'Western Cape', 'Bellville', 'intake@sanca-western-cape.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Garden Route', 'Western Cape', 'George', 'intake@sanca-garden-route.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),
('SANCA Toevlug Centre', 'Western Cape', 'Worcester', 'intake@sanca-toevlug-centre.sanca.org.za', ARRAY['inpatient'], TRUE, TRUE, TRUE, TRUE),

-- LIMPOPO (1)
('SANCA Limpopo', 'Limpopo', 'Polokwane', 'intake@sanca-limpopo.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),

-- NORTH WEST (1)
('SANCA Sanpark', 'North West', 'Klerksdorp', 'intake@sanca-sanpark.sanca.org.za', ARRAY['inpatient', 'outpatient'], TRUE, TRUE, TRUE, TRUE),

-- NORTHERN CAPE (1)
('SANCA Tsantsabane', 'Northern Cape', 'Postmasburg', 'intake@sanca-tsantsabane.sanca.org.za', ARRAY['outpatient'], TRUE, TRUE, TRUE, TRUE),

-- EASTERN CAPE (1)
('SANCA Central Eastern Cape', 'Eastern Cape', 'East London', 'intake@sanca-central-eastern-cape.sanca.org.za', ARRAY['inpatient', 'outpatient'], TRUE, TRUE, TRUE, TRUE);
