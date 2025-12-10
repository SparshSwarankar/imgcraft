-- ============================================
-- ImgCraft - Add Annotation Tool
-- Migration: Add annotation tool configuration
-- Date: 2025-12-11
-- ============================================

-- Insert annotation tool configuration
INSERT INTO tool_config (
    tool_name,
    display_name,
    credit_cost,
    description,
    is_active
)
VALUES (
    'annotation',
    'Image Annotation',
    6,
    'Professional annotation with bounding boxes, polygons, and metadata export',
    true
)
ON CONFLICT (tool_name) 
DO UPDATE SET
    credit_cost = 6,
    description = 'Professional annotation with bounding boxes, polygons, and metadata export',
    is_active = true,
    updated_at = NOW();

-- Verify the insertion
SELECT tool_name, display_name, credit_cost, description, is_active 
FROM tool_config 
WHERE tool_name = 'annotation';
