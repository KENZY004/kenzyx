-- Kenyx Dummy Data Seeder
-- Run this in your NeonDB SQL Editor to insert some problems to test with

-- Remove old dummy data if refreshing (optional)
-- DELETE FROM test_cases;
-- DELETE FROM problem_tags;
-- DELETE FROM problems;

-- 1. Insert "Two Sum"
INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status, is_daily, comparison_mode) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'two-sum',
    'Two Sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order. Please output the indices separated by a space.',
    '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    'Line 1: An integer n (array length)\nLine 2: n space-separated integers\nLine 3: An integer target',
    'Two space-separated integers representing the indices.',
    'easy',
    'approved',
    true,
    'sorted_numbers'
) ON CONFLICT DO NOTHING;

-- 2. Insert "Reverse String"
INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status) 
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'reverse-string',
    'Reverse String',
    'Write a function that reverses a string. The input string is given as a single line of text. Your task is to print the reversed string to the standard output.',
    '1 <= s.length <= 10^5\ns consists of printable ascii characters.',
    'A single line representing the string.',
    'The reversed string.',
    'easy',
    'approved'
) ON CONFLICT DO NOTHING;

-- 3. Insert "Longest Substring Without Repeating Characters"
INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status) 
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'longest-substring-without-repeating',
    'Longest Substring Without Repeating Characters',
    'Given a string s, find the length of the longest substring without repeating characters.',
    '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
    'A single line representing the string.',
    'An integer representing the length of the longest substring.',
    'medium',
    'approved'
) ON CONFLICT DO NOTHING;

-- 4. Insert "Median of Two Sorted Arrays"
INSERT INTO problems (id, slug, title, description, constraints, input_format, output_format, difficulty, status, comparison_mode) 
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'median-of-two-sorted-arrays',
    'Median of Two Sorted Arrays',
    'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).',
    'nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6',
    'Line 1: m (size of nums1)\nLine 2: m space-separated integers\nLine 3: n (size of nums2)\nLine 4: n space-separated integers',
    'A single floating point number representing the median.',
    'hard',
    'approved',
    'sorted_numbers'
) ON CONFLICT DO NOTHING;

-- Test Cases for Two Sum
-- Input format: Line 1 = n (array length), Line 2 = n integers, Line 3 = target
INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
VALUES 
    ('11111111-1111-1111-1111-111111111111', '4\n2 7 11 15\n9', '0 1', true, 0),
    ('11111111-1111-1111-1111-111111111111', '3\n3 2 4\n6', '1 2', true, 1),
    ('11111111-1111-1111-1111-111111111111', '2\n3 3\n6', '0 1', false, 2),
    ('11111111-1111-1111-1111-111111111111', '5\n10 20 30 40 50\n90', '3 4', false, 3)
ON CONFLICT DO NOTHING;

-- Test Cases for Reverse String
INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'hello', 'olleh', true, 0),
    ('22222222-2222-2222-2222-222222222222', 'Kenyx', 'xyneK', true, 1),
    ('22222222-2222-2222-2222-222222222222', 'Python', 'nohtyP', false, 2),
    ('22222222-2222-2222-2222-222222222222', '123456789', '987654321', false, 3)
ON CONFLICT DO NOTHING;

-- Test Cases for Longest Substring
INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'abcabcbb', '3', true, 0),
    ('33333333-3333-3333-3333-333333333333', 'bbbbb', '1', true, 1),
    ('33333333-3333-3333-3333-333333333333', 'pwwkew', '3', false, 2),
    ('33333333-3333-3333-3333-333333333333', '', '0', false, 3),
    ('33333333-3333-3333-3333-333333333333', ' ', '1', false, 4),
    ('33333333-3333-3333-3333-333333333333', 'dvdf', '3', false, 5)
ON CONFLICT DO NOTHING;

-- Test Cases for Median of Two Sorted Arrays
INSERT INTO test_cases (problem_id, input, expected, is_sample, order_num) 
VALUES 
    ('44444444-4444-4444-4444-444444444444', '2\n1 3\n1\n2', '2.0', true, 0),
    ('44444444-4444-4444-4444-444444444444', '2\n1 2\n2\n3 4', '2.5', true, 1),
    ('44444444-4444-4444-4444-444444444444', '1\n0\n1\n0', '0.0', false, 2)
ON CONFLICT DO NOTHING;

-- Tag linking
-- Linking Two-Sum to 'arrays' and 'hash-tables'
INSERT INTO problem_tags (problem_id, tag_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM tags WHERE slug IN ('arrays', 'hash-tables')
ON CONFLICT DO NOTHING;

-- Linking Reverse-String to 'strings'
INSERT INTO problem_tags (problem_id, tag_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM tags WHERE slug IN ('strings')
ON CONFLICT DO NOTHING;

-- Linking Longest Substring to 'strings' and 'sliding-window'
INSERT INTO problem_tags (problem_id, tag_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM tags WHERE slug IN ('strings', 'sliding-window')
ON CONFLICT DO NOTHING;

-- Linking Median to 'arrays' and 'binary-search'
INSERT INTO problem_tags (problem_id, tag_id)
SELECT '44444444-4444-4444-4444-444444444444', id FROM tags WHERE slug IN ('arrays', 'binary-search')
ON CONFLICT DO NOTHING;
