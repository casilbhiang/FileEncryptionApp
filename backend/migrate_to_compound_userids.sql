-- Migration script to update existing users with compound User IDs
-- Format: [INITIALS][ROLE_PREFIX]-[LAST3_NRIC]
-- Example: KYJHOPAT-67I

-- Update ADM001 (Jeslyn Ho - jeslynho2004@gmail.com)
-- "Jeslyn Ho" → JESHO + ADM + -67I = JESHOADM-67I
UPDATE users
SET user_id = 'JESHOADM-67I'
WHERE user_id = 'ADM001';

-- Update ADM002 (final year project - fyp2502@gmail.com)
-- "final year project" → FYP + ADM + -67A = FYPADM-67A
UPDATE users
SET user_id = 'FYPADM-67A'
WHERE user_id = 'ADM002';

-- Update ADM003 (JY Admin - jiayichow25@gmail.com)
-- "JY Admin" → JYADM + ADM + -67H = JYADMADM-67H
UPDATE users
SET user_id = 'JYADMADM-67H'
WHERE user_id = 'ADM003';

-- Update ADM004 (CJY Admin - cjysc00@gmail.com)
-- "CJY Admin" → CJYADM + ADM + -67C = CJYADMADM-67C
UPDATE users
SET user_id = 'CJYADMADM-67C'
WHERE user_id = 'ADM004';

-- Update DOC003 (JY - jiayichow23@gmail.com)
-- "JY" → JY + DOC + -67F = JYDOC-67F
UPDATE users
SET user_id = 'JYDOC-67F'
WHERE user_id = 'DOC003';

-- Update DOC004 (Basil C - basilchiang930@gmail.com)
-- "Basil C" → BC + DOC + -67D = BCDOC-67D
UPDATE users
SET user_id = 'BCDOC-67D'
WHERE user_id = 'DOC004';

-- Update DOC005 (JY Doc - jychow25@gmail.com)
-- "JY Doc" → JYDOC + DOC + -67B = JYDOCDOC-67B
UPDATE users
SET user_id = 'JYDOCDOC-67B'
WHERE user_id = 'DOC005';

-- Update DOC006 (Dr. Jessica Ong - jesslynho2004@gmail.com)
-- "Dr. Jessica Ong" → JO + DOC + -65G = JODOC-65G
UPDATE users
SET user_id = 'JODOC-65G'
WHERE user_id = 'DOC006';

-- Update PAT003 (Jiayi - jiayichow2016@gmail.com)
-- "Jiayi" (single name) → JIA + PAT + -67G = JIAPAT-67G
UPDATE users
SET user_id = 'JIAPAT-67G'
WHERE user_id = 'PAT003';

-- Update PAT004 (JY Pat - jycyu25@gmail.com)
-- "JY Pat" → JYPAT + PAT + -67E = JYPATPAT-67E
UPDATE users
SET user_id = 'JYPATPAT-67E'
WHERE user_id = 'PAT004';

-- Verify the updates
SELECT user_id, full_name, email, nric
FROM users
ORDER BY user_id;

/*
IMPORTANT: Update these User IDs based on actual full names in your database!
The initials logic is:
1. Split full name by spaces
2. Take first letter of each middle name
3. Add the last name (surname)
4. Append role prefix
5. Add dash and last 3 characters of NRIC

Example:
- "Ho Ka Yan Jeslyn" → K + Y + J + HO + ADM + - + 67I = KYJHOADM-67I
- "Chow Jia Yi" → J + Y + CHOW + DOC + - + 67F = JYCHOWDOC-67F
*/
