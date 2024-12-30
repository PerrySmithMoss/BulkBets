-- +goose Up
-- +goose StatementBegin
CREATE TYPE permission_type AS ENUM (
    'read',
    'write',
    'delete',
    'admin'
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource VARCHAR(50) NOT NULL,
    action permission_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Triggers to auto-update timestamps
CREATE TRIGGER set_updated_at_roles
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER set_updated_at_permissions
    BEFORE UPDATE ON permissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Insert basic roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access'),
    ('moderator', 'Can moderate content and manage some settings'),
    ('user', 'Regular user access');

-- Insert permissions for betting results
INSERT INTO permissions (resource, action, description) VALUES
    ('betting_results', 'read', 'Can view betting results'),
    ('betting_results', 'write', 'Can record betting results'),
    ('betting_results', 'delete', 'Can delete betting results');

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON r.name = 'admin';

-- Assign write permission to moderator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON r.name = 'moderator'
WHERE p.resource = 'betting_results' AND p.action IN ('read', 'write');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop triggers first
DROP TRIGGER IF EXISTS set_updated_at_roles ON roles;
DROP TRIGGER IF EXISTS set_updated_at_permissions ON permissions;

-- Drop indexes
DROP INDEX IF EXISTS idx_role_permissions_role_id;
DROP INDEX IF EXISTS idx_role_permissions_permission_id;
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP INDEX IF EXISTS idx_user_roles_role_id;

-- Drop tables in correct order (dependent tables first)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS permission_type;
-- +goose StatementEnd
