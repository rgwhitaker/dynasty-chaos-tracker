ALTER TABLE IF EXISTS recruiter_hub_depth_chart_mapping RENAME TO depth_chart_mapping;

ALTER INDEX IF EXISTS idx_recruiter_hub_depth_chart_mapping_dynasty_id
    RENAME TO idx_depth_chart_mapping_dynasty_id;
