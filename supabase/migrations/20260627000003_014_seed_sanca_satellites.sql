-- Migration 014: Seed SANCA satellite offices and Stabilis outpatient location
-- Links satellite locations to parent organisations via member_org_id

-- SANCA Horizon Centre satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Horizon - Barcelona', 'Gauteng', 'Barcelona', 'intake@horizon-centre.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Horizon Centre';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Horizon - Daveyton', 'Gauteng', 'Daveyton', 'intake@horizon-centre.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Horizon Centre';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Horizon - Etwatwa', 'Gauteng', 'Etwatwa', 'intake@horizon-centre.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Horizon Centre';

-- SANCA Nishtara satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Nishtara - Orange Farm', 'Gauteng', 'Orange Farm', 'intake@nishtara.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Nishtara';

-- SANCA Castle Carey satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Castle Carey - Hammanskraal', 'Gauteng', 'Hammanskraal', 'intake@castle-carey.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Castle Carey';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Castle Carey - Soshanguve', 'Gauteng', 'Soshanguve', 'intake@castle-carey.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Castle Carey';

-- SANCA Eastern Gauteng satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Alberton', 'Gauteng', 'Alberton', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Alra Park', 'Gauteng', 'Alra Park', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Brakpan', 'Gauteng', 'Brakpan', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Daveyton', 'Gauteng', 'Daveyton', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Geluksdal', 'Gauteng', 'Geluksdal', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Germiston', 'Gauteng', 'Germiston', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Katlehong', 'Gauteng', 'Katlehong', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Kwa-Thema', 'Gauteng', 'Kwa-Thema', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Nigel', 'Gauteng', 'Nigel', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Palm Ridge', 'Gauteng', 'Palm Ridge', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Springs', 'Gauteng', 'Springs', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Tokoza', 'Gauteng', 'Tokoza', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Eastern Gauteng - Vosloorus', 'Gauteng', 'Vosloorus', 'intake@eastern-gauteng.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Eastern Gauteng';

-- SANCA Central Rand satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Central Rand - Alexandra', 'Gauteng', 'Alexandra', 'intake@central-rand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Central Rand';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Central Rand - Diepsloot', 'Gauteng', 'Diepsloot', 'intake@central-rand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Central Rand';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Central Rand - Eldorado Park', 'Gauteng', 'Eldorado Park', 'intake@central-rand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Central Rand';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Central Rand - Golden Harvest', 'Gauteng', 'Golden Harvest', 'intake@central-rand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Central Rand';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Central Rand - Rosettenville', 'Gauteng', 'Rosettenville', 'intake@central-rand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Central Rand';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Central Rand - Westbury', 'Gauteng', 'Westbury', 'intake@central-rand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Central Rand';

-- SANCA Soweto satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Soweto - Diepkloof', 'Gauteng', 'Diepkloof', 'intake@soweto.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Soweto';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Soweto - Meadowlands', 'Gauteng', 'Meadowlands', 'intake@soweto.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Soweto';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Soweto - Midrand', 'Gauteng', 'Midrand', 'intake@soweto.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Soweto';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Soweto - Protea Glen', 'Gauteng', 'Protea Glen', 'intake@soweto.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Soweto';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Soweto - Tembisa', 'Gauteng', 'Tembisa', 'intake@soweto.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Soweto';

-- SANCA Thusong satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Thusong - Nellmapius', 'Gauteng', 'Nellmapius', 'intake@thusong.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Thusong';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Thusong - Refilwe', 'Gauteng', 'Refilwe', 'intake@thusong.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Thusong';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Thusong - Rethabiseng', 'Gauteng', 'Rethabiseng', 'intake@thusong.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Thusong';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Thusong - Zithobeni', 'Gauteng', 'Zithobeni', 'intake@thusong.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Thusong';

-- SANCA Vaal Triangle satellites (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Vaal Triangle - Evaton', 'Gauteng', 'Evaton', 'intake@vaal-triangle.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Vaal Triangle';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Vaal Triangle - Sharpeville', 'Gauteng', 'Sharpeville', 'intake@vaal-triangle.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Vaal Triangle';

-- SANCA Durban satellites (KwaZulu-Natal)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Durban - Sizane', 'KwaZulu-Natal', 'Merewent', 'intake@durban.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Durban';

-- SANCA Newcastle satellites (KwaZulu-Natal)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Newcastle - Ladysmith', 'KwaZulu-Natal', 'Ladysmith', 'intake@newcastle.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Newcastle';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Newcastle - Msinga', 'KwaZulu-Natal', 'Msinga', 'intake@newcastle.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Newcastle';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Newcastle - Nqutu', 'KwaZulu-Natal', 'Nqutu', 'intake@newcastle.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Newcastle';

-- SANCA Zululand satellites (KwaZulu-Natal)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Zululand - Nkandla', 'KwaZulu-Natal', 'Nkandla', 'intake@zululand.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Zululand';

-- SANCA Nongoma satellites (KwaZulu-Natal)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Nongoma - Benedictine', 'KwaZulu-Natal', 'Benedictine', 'intake@nongoma.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Nongoma';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Nongoma - Pongola', 'KwaZulu-Natal', 'Pongola', 'intake@nongoma.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Nongoma';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Nongoma - Mondlo', 'KwaZulu-Natal', 'Mondlo', 'intake@nongoma.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Nongoma';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Nongoma - Jozini', 'KwaZulu-Natal', 'Jozini', 'intake@nongoma.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Nongoma';

-- SANCA Witbank satellites (Mpumalanga)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Witbank - Ackerville', 'Mpumalanga', 'Ackerville', 'intake@witbank.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Witbank';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Witbank - Delmas', 'Mpumalanga', 'Delmas', 'intake@witbank.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Witbank';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Witbank - Ezinambeni', 'Mpumalanga', 'Ezinambeni', 'intake@witbank.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Witbank';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Witbank - Klarinet Thuson', 'Mpumalanga', 'Klarinet Thuson', 'intake@witbank.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Witbank';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Witbank - Middleburg', 'Mpumalanga', 'Middleburg', 'intake@witbank.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Witbank';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Witbank - Phola', 'Mpumalanga', 'Phola', 'intake@witbank.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Witbank';

-- SANCA Sasolburg satellites (Free State)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Sasolburg - Parys', 'Free State', 'Parys', 'intake@sasolburg.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Sasolburg';

-- SANCA Western Cape satellites (Western Cape)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Western Cape - Boston', 'Western Cape', 'Boston', 'intake@western-cape.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Western Cape';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Western Cape - Athlone', 'Western Cape', 'Athlone', 'intake@western-cape.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Western Cape';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Western Cape - Gugulethu', 'Western Cape', 'Gugulethu', 'intake@western-cape.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Western Cape';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Western Cape - Khayelitsha', 'Western Cape', 'Khayelitsha', 'intake@western-cape.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Western Cape';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Western Cape - Loriesfontein', 'Western Cape', 'Loriesfontein', 'intake@western-cape.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Western Cape';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Western Cape - Paarl', 'Western Cape', 'Paarl', 'intake@western-cape.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Western Cape';

-- SANCA Garden Route satellites (Western Cape)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Garden Route - Mossel Bay', 'Western Cape', 'Mossel Bay', 'intake@garden-route.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Garden Route';

-- SANCA Limpopo satellites (Limpopo)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Limpopo - Greater Tzaneen', 'Limpopo', 'Greater Tzaneen', 'intake@limpopo.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Limpopo';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Limpopo - Bela Bela', 'Limpopo', 'Bela Bela', 'intake@limpopo.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Limpopo';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Limpopo - Jane Furse', 'Limpopo', 'Jane Furse', 'intake@limpopo.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Limpopo';

INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Limpopo - Thohoyandou', 'Limpopo', 'Thohoyandou', 'intake@limpopo.sanca.org.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'SANCA Limpopo';

-- Stabilis outpatient location (Gauteng)
INSERT INTO centres (name, province, city, intake_email, bed_type, member_org_id, accepts_dsd, accepts_medical_aid, accepts_private, is_active)
SELECT 'Pretoria-East / Moot', 'Gauteng', 'Pretoria', 'reception@stabilistc.co.za', ARRAY['outpatient'], id, TRUE, TRUE, TRUE, TRUE
FROM centres WHERE name = 'Stabilis';
