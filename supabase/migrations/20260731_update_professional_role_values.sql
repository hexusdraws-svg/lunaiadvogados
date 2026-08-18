-- Migração: Atualizar valores de professional_role para o novo modelo de permissões
-- Valores antigos → novos valores:
--   admin → null (administradores não têm professional_role)
--   lawyer → lawyer (mantido)
--   receptionist → receptionist (mantido)
--   secretary → secretary (mantido)
--   manager → assistant
--   intern → assistant
--   other → null

UPDATE profiles
SET professional_role = CASE
  WHEN professional_role = 'admin' THEN NULL
  WHEN professional_role = 'manager' THEN 'assistant'
  WHEN professional_role = 'intern' THEN 'assistant'
  WHEN professional_role = 'other' THEN NULL
  ELSE professional_role
END
WHERE professional_role IN ('admin', 'manager', 'intern', 'other');