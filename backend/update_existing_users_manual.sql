-- Complete migration script for existing users
-- Updates: NRIC, DOB, and Compound User IDs
-- Run this in your Supabase SQL editor
-- Note: NRIC starting with 'T' is for those born in 2000 and after
--       NRIC starting with 'S' is for those born before 2000

-- Update ADM001 (jeslynho2004@gmail.com - Jeslyn Ho)
-- Set NRIC, DOB, and new compound User ID
UPDATE users
SET nric = 'T0434567I',
    date_of_birth = '2004-08-10',
    user_id = 'JESHOADM-67I',
    updated_at = NOW()
WHERE user_id = 'ADM001';

-- Update ADM002 (fyp2502@gmail.com - final year project)
UPDATE users
SET nric = 'T0234567A',
    date_of_birth = '2002-01-15',
    user_id = 'FYPADM-67A',
    updated_at = NOW()
WHERE user_id = 'ADM002';

-- Update ADM003 (jiayichow25@gmail.com - JY Admin)
UPDATE users
SET nric = 'T0234567H',
    date_of_birth = '2002-11-25',
    user_id = 'JYADMADM-67H',
    updated_at = NOW()
WHERE user_id = 'ADM003';

-- Update ADM004 (cjysc00@gmail.com - CJY Admin)
UPDATE users
SET nric = 'T0034567C',
    date_of_birth = '2000-05-12',
    user_id = 'CJYADMADM-67C',
    updated_at = NOW()
WHERE user_id = 'ADM004';

-- Update DOC003 (jiayichow23@gmail.com - JY)
UPDATE users
SET nric = 'T0134567F',
    date_of_birth = '2001-12-23',
    user_id = 'JYDOC-67F',
    updated_at = NOW()
WHERE user_id = 'DOC003';

-- Update DOC004 (basilchiang930@gmail.com - Basil C)
UPDATE users
SET nric = 'T0334567D',
    date_of_birth = '2003-09-30',
    user_id = 'BCDOC-67D',
    updated_at = NOW()
WHERE user_id = 'DOC004';

-- Update DOC005 (jychow25@gmail.com - JY Doc)
UPDATE users
SET nric = 'T0134567B',
    date_of_birth = '2001-03-20',
    user_id = 'JYDOCDOC-67B',
    updated_at = NOW()
WHERE user_id = 'DOC005';

-- Update DOC006 (jesslynho2004@gmail.com - Dr. Jessica Ong)
UPDATE users
SET nric = 'T0436665G',
    date_of_birth = '1988-12-30',
    user_id = 'JODOC-65G',
    updated_at = NOW()
WHERE user_id = 'DOC006';

-- Update PAT003 (jiayichow2016@gmail.com - Jiayi)
UPDATE users
SET nric = 'T0434567G',
    date_of_birth = '2004-06-16',
    user_id = 'JIAPAT-67G',
    updated_at = NOW()
WHERE user_id = 'PAT003';

-- Update PAT004 (jycyu25@gmail.com - JY Pat)
UPDATE users
SET nric = 'T0234567E',
    date_of_birth = '2002-07-25',
    user_id = 'JYPATPAT-67E',
    updated_at = NOW()
WHERE user_id = 'PAT004';

-- Verify the updates
SELECT user_id, full_name, email, nric, date_of_birth
FROM users
ORDER BY user_id;
