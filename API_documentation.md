## ProjectX Admin APIs

This document describes REST APIs to replace Django template workflows for admins, managers, agents, staffs, superadmins, and operational dashboards. All endpoints are prefixed by `/api/v1/`.

Common Query Params
- `search`: Applies to endpoints with search enabled.
- `page`, `page_size`: Standard pagination per DRF settings.
- Unless specified, all timestamps are ISO 8601.

Authentication
- POST /users/login/
  - Authenticates users and returns JWT tokens
  - Required fields: email_or_username, password, whitelabel_admin_uuid
  - Returns: JWT access token, user data, and sets HTTP-only cookie

Request example:
```json
{
  "username": "admin",
  "password": "password123",
  "whitelabel_admin_uuid": "your-project-uuid", // not needed for superadmin login
}
```

Response example:
```json
{
    "auth_token": {
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1OTk0NjM5NCwiaWF0IjoxNzU5ODU5OTk0LCJqdGkiOiJhN2YzYTViODdjMzc0ZTE5YTgxNDEwZTQwNWFhZGY2ZCIsInVzZXJfaWQiOjF9.u8-wChcGc--46pv6m6L5Xiozs2PvU34xlKFG4pcQBM8",
        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU5ODg4Nzk0LCJpYXQiOjE3NTk4NTk5OTQsImp0aSI6ImI0MTA2MDYwZmM4YTRiNzBhNWQxMDI1MzY2NWZiYmU2IiwidXNlcl9pZCI6MX0.9TrDEo17ajSEdwK4PsStr1wYa5F60KfuccZ5b5gNYRQ"
    },
    "pk": 1,
    "role": "superadmin",
    "username": "superadmin",
    "last_login": "2025-10-07T17:59:54.637415Z"
}
```

cURL example:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123",
    "whitelabel_admin_uuid": "your-project-uuid"
  }' \
  https://<BE_DOMAIN>/users/login/
```

Notes:
- The endpoint sets an HTTP-only cookie with the access token
- Use the returned `auth_token` in `Authorization: Bearer <token>` header for subsequent requests
- Supports both email and username for login
- Requires valid whitelabel_admin_uuid for multi-tenant support

Company Management (superadmin only)
- GET /api/v1/companies/
  - Lists all companies with their project information
  - Query params: search (searches username, email, project_name), page, page_size
  - Returns: paginated list of companies with project details

- POST /api/v1/companies/
  - Creates a new company with associated WhiteLabelAdmin project
  - Required fields: project_name, project_domain, admin_project_domain, username, password, email, service_email, service_name
  - Optional fields: game_api_url, game_api_key, service_creds, logo
  - Automatically generates initial data for the company
  - Returns: company details with project information

- PUT /api/v1/companies/{id}/
  - Updates a company and its associated WhiteLabelAdmin project
  - All fields are optional for updates
  - Returns: updated company details with project information

- PATCH /api/v1/companies/{id}/
  - Partially updates a company and its associated WhiteLabelAdmin project
  - All fields are optional for partial updates
  - Returns: updated company details with project information

GET Response example:
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "username": "company1",
      "email": "admin@company1.com",
      "project_name": "Company 1 Platform",
      "project_domain": "https://company1.com",
      "admin_project_domain": "https://admin.company1.com",
      "is_active": true,
      "created": "2024-01-15T10:30:00Z",
      "modified": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "username": "company2",
      "email": "admin@company2.com",
      "project_name": "Company 2 Platform",
      "project_domain": "https://company2.com",
      "admin_project_domain": "https://admin.company2.com",
      "is_active": true,
      "created": "2024-01-16T11:45:00Z",
      "modified": "2024-01-16T11:45:00Z"
    }
  ]
}
```

cURL example (GET):
```bash
curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/companies/?search=company1"
```

PUT Request example:
```json
{
  "project_name": "Updated Gaming Platform",
  "project_domain": "https://updated-gaming.com",
  "admin_project_domain": "https://admin.updated-gaming.com",
  "username": "updatedadmin",
  "email": "updated@example.com",
  "service_email": "support@updated-gaming.com",
  "service_name": "Updated Gaming Support",
  "is_active": true
}
```

PATCH Request example:
```json
{
  "project_name": "Partially Updated Platform",
  "is_active": false
}
```

PUT/PATCH Response example:
```json
{
  "status": "success",
  "message": "Company updated successfully",
  "data": {
    "id": 1,
    "username": "updatedadmin",
    "email": "updated@example.com",
    "project_name": "Updated Gaming Platform",
    "project_domain": "https://updated-gaming.com",
    "admin_project_domain": "https://admin.updated-gaming.com",
    "is_active": true,
    "created": "2024-01-15T10:30:00Z",
    "modified": "2024-01-15T12:45:00Z"
  }
}
```

cURL example (PUT):
```bash
curl -X PUT -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "project_name": "Updated Gaming Platform",
    "project_domain": "https://updated-gaming.com",
    "admin_project_domain": "https://admin.updated-gaming.com",
    "username": "updatedadmin",
    "email": "updated@example.com",
    "service_email": "support@updated-gaming.com",
    "service_name": "Updated Gaming Support",
    "is_active": true
  }' \
  https://<BE_DOMAIN>/api/v1/companies/1/
```

cURL example (PATCH):
```bash
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "project_name": "Partially Updated Platform",
    "is_active": false
  }' \
  https://<BE_DOMAIN>/api/v1/companies/1/
```

POST Request example:
```json
{
    "project_name": "My Gaming Platform 1",
    "project_domain": "https://mygaming.com",
    "admin_project_domain": "https://admin.mygaming.com",
    "username": "companyadmin",
    "password": "SecurePass123!",
    "email": "admin@mygaming.com",
    "service_email": "support@mygaming.com",
    "service_name": "My Gaming Support"
  }
```

Response example:
```json
{
    "status": "success",
    "message": "Company created successfully",
    "data": {
        "id": 32,
        "username": "companyadmin",
        "email": "admin@mygaming.com",
        "project_name": "My Gaming Platform 1",
        "project_domain": "https://mygaming.com",
        "admin_project_domain": "https://admin.mygaming.com",
        "is_active": true,
        "created": "2025-10-07T18:02:45.527553Z"
    }
}
```

cURL example:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "project_name": "My Gaming Platform 1",
    "project_domain": "https://mygaming.com",
    "admin_project_domain": "https://admin.mygaming.com",
    "username": "companyadmin",
    "password": "SecurePass123!",
    "email": "admin@mygaming.com",
    "service_email": "support@mygaming.com",
    "service_name": "My Gaming Support"
  }' \
  https://<BE_DOMAIN>/api/v1/companies/
```

Validation rules:
- Username: alphanumeric, min 4 characters, unique
- Email: valid format, unique
- Password: min 5 characters
- Project name: unique across all projects
- Manager limit: positive integer

Users and Roles
- GET /api/v1/companies/
- GET /api/v1/managers/
- GET /api/v1/agents/
- GET /api/v1/staffs/
- GET /api/v1/players/
Response item fields: 
- Agents: id, username, email, role, is_active, project_id, created, modified (excludes balance, winning_balance, full_name)
- Players: id, username, email, full_name, role, balance, winning_balance, is_active, project_id, created, modified (includes comprehensive profile fields)
- Managers: id, username, email, role, is_active, project_id, created, modified (excludes balance, winning_balance, full_name)
- Staffs: id, username, email, role, is_active, project_id, mobile_number, created, modified (excludes balance, winning_balance, full_name)

Example list response (agents):
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{"id": 12, "username": "agent1", "email": "a@example.com", "role": "agent", "is_active": true, "project_id": 1, "created": "2024-01-15T10:30:00Z", "modified": "2024-01-15T10:30:00Z"}]
}

Example list response (managers):
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{"id": 15, "username": "manager11", "email": "manager11@example.com", "role": "manager", "is_active": true, "project_id": 1, "created": "2024-01-15T10:30:00Z", "modified": "2024-01-15T10:30:00Z"}]
}

Example list response (staffs):
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{"id": 16, "username": "staff1", "email": "staff1@example.com", "role": "staff", "is_active": true, "project_id": 1, "mobile_number": "+1234567890", "created": "2024-01-15T10:30:00Z", "modified": "2024-01-15T10:30:00Z"}]
}

Example list response (players):
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{"id": 17, "username": "player1", "email": "player1@example.com", "full_name": "John Player", "role": "player", "balance": "0.00", "winning_balance": "0.00", "is_active": true, "project_id": 1, "created": "2024-01-15T10:30:00Z", "modified": "2024-01-15T10:30:00Z"}]
}

Create/Update users by role (admins-only)
- POST /api/v1/agents/ { username, email, password, full_name, ... }
- POST /api/v1/managers/ { username, email, password, role }
- POST /api/v1/staffs/ { username, email, password, role, mobile_number }
- POST /api/v1/players/ { username, full_name, dob, email, mobile_number, password, role }
- PATCH /api/v1/{agents|managers|staffs|players}/{id}/ {...}

cURL (list agents):
```
curl -H "Authorization: Bearer <JWT>" \
  https://<BE_DOMAIN>/api/v1/agents/?search=agent
```

Detailed description:
- These endpoints provide paginated lists of users by role. Use `search` to filter by username or email. Admin-level roles (company, superadmin) can create or update other role users via the endpoints below. Regular authentication is required; role enforcement for mutations is handled by the backend.

Permissions:
- Requires `IsAuthenticated` for listing; {company, superadmin} for create/update.

cURL (create agent):
```
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"username":"agent1","email":"a@example.com","password":"StrongPass123!","is_active":true, "role": "agent"}' \
  https://<BE_DOMAIN>/api/v1/agents/
```

cURL (create manager):
```
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"username":"manager11","email":"manager11@example.com","password":"SecurePass123!","role":"manager"}' \
  https://<BE_DOMAIN>/api/v1/managers/
```

cURL (create staff):
```
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"username":"staff1","email":"staff1@example.com","password":"SecurePass123!","role":"staff","mobile_number":"+1234567890"}' \
  https://<BE_DOMAIN>/api/v1/staffs/
```

cURL (create player):
```
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"username":"player1","full_name":"John Player","dob":"1990-01-15","email":"player1@example.com","mobile_number":"+1234567890","password":"SecurePass123!","role":"player"}' \
  https://<BE_DOMAIN>/api/v1/players/
```

cURL (update agent):
```
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"is_active":false}' \
  https://<BE_DOMAIN>/api/v1/agents/12/
```

cURL (update manager):
```
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"is_active":false}' \
  https://<BE_DOMAIN>/api/v1/managers/15/
```

cURL (update staff):
```
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"is_active":false,"mobile_number":"+9876543210"}' \
  https://<BE_DOMAIN>/api/v1/staffs/16/
```

cURL (update player):
```
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"full_name":"John Updated Player","mobile_number":"+9876543210"}' \
  https://<BE_DOMAIN>/api/v1/players/17/
```

POST /api/v1/managers/ - Create Manager
Creates a new manager user account with the specified role and permissions.

Required Fields:
- `username`: Unique username for login (alphanumeric, min 4 characters)
- `email`: Valid email address (must be unique)
- `password`: Password for authentication (min 5 characters)
- `role`: User role (must be "manager")

Request Example:
```json
{
  "username": "manager11",
  "email": "manager11@example.com",
  "password": "SecurePass123!",
  "role": "manager"
}
```

Response Example (Success):
```json
{
  "id": 15,
  "username": "manager11",
  "email": "manager11@example.com",
  "role": "manager",
  "is_active": true,
  "project_id": 1,
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-15T10:30:00Z"
}
```

Response Example (Error):
```json
{
  "username": ["This field is required."],
  "email": ["Enter a valid email address."],
  "password": ["This field is required."],
  "role": ["This field is required."]
}
```

Validation Rules:
- Username: Must be alphanumeric, minimum 4 characters, unique across all users
- Email: Must be valid email format, unique across all users
- Password: Minimum 5 characters, will be hashed automatically
- Role: Must be "manager" for this endpoint

Permissions:
- Requires `IsAuthenticated` and role in {company, superadmin}
- Only company admins and superadmins can create managers
- Managers are automatically assigned to the creating admin's project

cURL Example:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "username": "manager11",
    "email": "manager11@example.com",
    "password": "SecurePass123!",
    "role": "manager"
  }' \
  https://<BE_DOMAIN>/api/v1/managers/
```

Notes:
- Only the four required fields are accepted in the request.
- GET and POST responses exclude balance, winning_balance, and full_name fields for managers.
- Password is optional on update; if provided it will be set.
- Manager role is automatically assigned during creation.
- All managers are associated with the creating admin's project.

POST /api/v1/staffs/ - Create Staff
Creates a new staff user account with the specified role and permissions.

Required Fields:
- `username`: Unique username for login (alphanumeric, min 4 characters)
- `email`: Valid email address (must be unique)
- `password`: Password for authentication (min 5 characters)
- `role`: User role (must be "staff")

Optional Fields:
- `mobile_number`: Contact phone number

Request Example:
```json
{
  "username": "staff1",
  "email": "staff1@example.com",
  "password": "SecurePass123!",
  "role": "staff",
  "mobile_number": "+1234567890"
}
```

Response Example (Success):
```json
{
  "id": 16,
  "username": "staff1",
  "email": "staff1@example.com",
  "role": "staff",
  "is_active": true,
  "project_id": 1,
  "mobile_number": "+1234567890",
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-15T10:30:00Z"
}
```

Response Example (Error):
```json
{
  "username": ["This field is required."],
  "email": ["Enter a valid email address."],
  "password": ["This field is required."],
  "role": ["This field is required."]
}
```

Validation Rules:
- Username: Must be alphanumeric, minimum 4 characters, unique across all users
- Email: Must be valid email format, unique across all users
- Password: Minimum 5 characters, will be hashed automatically
- Role: Must be "staff" for this endpoint
- Mobile Number: Should be valid phone number format if provided

Permissions:
- Requires `IsAuthenticated` and role in {company, superadmin}
- Only company admins and superadmins can create staff
- Staff members are automatically assigned to the creating admin's project

cURL Example:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "username": "staff1",
    "email": "staff1@example.com",
    "password": "SecurePass123!",
    "role": "staff",
    "mobile_number": "+1234567890"
  }' \
  https://<BE_DOMAIN>/api/v1/staffs/
```

Notes:
- Required fields: username, email, password, role. Optional field: mobile_number.
- GET and POST responses exclude balance, winning_balance, and full_name fields for staff.
- Password is optional on update; if provided it will be set.
- Staff role is automatically assigned during creation.
- All staff members are associated with the creating admin's project.
- Staff members have access to admin panel with limited permissions.

POST /api/v1/players/ - Create Player
Creates a new player user account with essential profile information.

Required Fields:
- `username`: Unique username for login (alphanumeric, min 4 characters)
- `full_name`: Complete name of the player
- `dob`: Date of birth (YYYY-MM-DD format)
- `email`: Valid email address (must be unique)
- `mobile_number`: Contact phone number
- `password`: Password for authentication (min 5 characters)
- `role`: User role (must be "player" for players)

Request Example:
```json
{
  "username": "player1",
  "full_name": "John Player",
  "dob": "1990-01-15",
  "email": "player1@example.com",
  "mobile_number": "+1234567890",
  "password": "SecurePass123!",
  "role": "player"
}
```

Response Example (Success):
```json
{
  "id": 17,
  "username": "player1",
  "email": "player1@example.com",
  "full_name": "John Player",
  "role": "player",
  "balance": "0.00",
  "winning_balance": "0.00",
  "is_active": true,
  "project_id": 1,
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-15T10:30:00Z"
}
```

Response Example (Error):
```json
{
  "username": ["This field is required."],
  "email": ["Enter a valid email address."],
  "password": ["This field is required."],
  "role": ["This field is required."]
}
```

Validation Rules:
- Username: Must be alphanumeric, minimum 4 characters, unique across all users
- Full Name: Required field, cannot be empty
- Date of Birth: Must be valid date in YYYY-MM-DD format
- Email: Must be valid email format, unique across all users
- Mobile Number: Required field, should be valid phone number format
- Password: Minimum 5 characters, will be hashed automatically
- Role: Must be "player" for players

Permissions:
- Requires `IsAuthenticated` and role in {company, superadmin}
- Only company admins and superadmins can create players
- Players are automatically assigned to the creating admin's project

cURL Example:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "full_name": "John Player",
    "dob": "1990-01-15",
    "email": "player1@example.com",
    "mobile_number": "+1234567890",
    "password": "SecurePass123!",
    "role": "player"
  }' \
  https://<BE_DOMAIN>/api/v1/players/
```

Notes:
- Only the seven required fields are accepted in the request.
- GET and POST responses include balance, winning_balance, and full_name fields for players.
- Password is optional on update; if provided it will be set.
- Player role is automatically assigned during creation.
- All players are associated with the creating admin's project.
- Players have access to gaming features and can participate in games and transactions.

Games
- GET /api/v1/games/
  - Query: search=title|code|game_category
  - Returns: id, title, code, game_category, game_status, created
- GET /api/v1/user-games/?user_id=<id>
  - Returns: id, user_id, game_id, game, code, username, status, game_state, created_at, updated_at

Update game (admins-only):
Request:
{ "title": "Updated Cool Slots", "game_status": true, "dashboard_url": "https://..." }
Response:
Permissions:
- Requires `IsAuthenticated` and role in {company, superadmin} to update/enable/disable.
- Listing requires authentication.
- Games are manually created and cannot be created via API.

cURL (list games):
```
curl -H "Authorization: Bearer <JWT>" \
  https://<BE_DOMAIN>/api/v1/games/?search=slot
```

cURL (update game):
```
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"title":"Updated Cool Slots","game_status":true,"dashboard_url":"https://..."}' \
  https://<BE_DOMAIN>/api/v1/games/5/
```

cURL (enable/disable game):
```
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"game_status": true}' \
  https://<BE_DOMAIN>/api/v1/games/5/

curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"game_status": false}' \
  https://<BE_DOMAIN>/api/v1/games/5/
```

Detailed description:
- Games are manually created and cannot be created via API. Only updates (PATCH) are allowed.
- Enabling/disabling is done by setting `game_status` to `true` (enabled) or `false` (disabled) via PATCH request.
- Changing `game_status` affects availability in user UIs.
- Response example: { "id": 5, "title": "Cool Slots", "code": "CSLT", "game_category": "slot", "game_status": false, "dashboard_url": "https://..." }

Game management (admins-only)
- PATCH /api/v1/games/{id}/ { title, game_status, dashboard_url }

Store Balance Check
- POST /api/v1/check-store-balance/
  - Request: { "game_id": 5 }
  - Returns: { "status": "success", "total_balance": 1500.50, "message": "Total game store balance fetched successfully." }
  - Purpose: Check total balance across all user games for a specific game

Manual Affiliate Management
- POST /api/v1/add-manual-affiliate/
  - Request: { "agent_id": 12, "player_id": 25 }
  - Returns: { "status": "success", "message": "Affiliate added successfully.", "data": {...} }
  - Purpose: Manually add a player as an affiliate to an agent

POST /api/v1/check-store-balance/ - Check Store Balance
Checks the total balance across all user games for a specific game.

Required Fields:
- `game_id`: ID of the game to check store balance for

Request Example:
```json
{
  "game_id": 5
}
```

Response Example (Success):
```json
{
  "status": "success",
  "total_balance": 1500.50,
  "message": "Total game store balance fetched successfully."
}
```

Response Example (Error):
```json
{
  "status": "error",
  "message": "game_id is required."
}
```

Permissions:
- Requires `IsAuthenticated`
- Uses the authenticated user's project configuration for game API access

cURL Example:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"game_id": 5}' \
  https://<BE_DOMAIN>/api/v1/check-store-balance/
```

Notes:
- This endpoint checks the total balance across all user games for the specified game.
- Uses the game API configuration from the user's project settings.
- Returns the total balance as a float value.

POST /api/v1/add-manual-affiliate/ - Add Manual Affiliate
Manually adds a player as an affiliate to an agent.

Required Fields:
- `agent_id`: ID of the agent to assign the affiliate to
- `player_id`: ID of the player to be assigned as affiliate

Request Example:
```json
{
  "agent_id": 12,
  "player_id": 25
}
```

Response Example (Success):
```json
{
  "status": "success",
  "message": "Affiliate added successfully.",
  "data": {
    "agent_id": 12,
    "agent_username": "agent1",
    "player_id": 25,
    "player_username": "player1"
  }
}
```

Response Example (Error):
```json
{
  "status": "error",
  "message": "Player is already affiliated."
}
```

Validation Rules:
- Agent ID: Must be a valid agent user ID
- Player ID: Must be a valid player user ID
- Player cannot already be affiliated with another agent
- Both agent and player must exist in the system

Permissions:
- Requires `IsAuthenticated`
- Available to all authenticated users

cURL Example:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"agent_id": 12, "player_id": 25}' \
  https://<BE_DOMAIN>/api/v1/add-manual-affiliate/
```

Notes:
- This endpoint manually assigns a player as an affiliate to an agent.
- Once assigned, the player will be associated with the agent for commission tracking.
- Players can only be affiliated with one agent at a time.
- The affiliation relationship is stored in the player's `affiliated_by` field.

Transactions
- GET /api/v1/transactions/
  - Query: search=user__username|status|type, type=processing|history, txn=purchases|cashouts
  - Returns: id, user_id, amount, status, transaction_id, operator, type
  - Special type parameters:
    - `type=processing`: Shows transactions with status "pending" or "failed"
    - `type=history`: Shows transactions with status "completed" or "cancelled"
  - Special txn parameters (takes priority over type parameter):
    - `txn=purchases`: Shows pending purchase transactions only (excludes game transactions)
    - `txn=cashouts`: Shows pending cashout transactions only (excludes game transactions)
- GET /api/v1/transaction-queues/
  - Query: type, status, user_id
  - Returns: id, type, status, user_id, game, game_code, amount, remarks, data, created_at, updated_at
  - Special type parameters:
    - `type=processing`: Shows transaction queues with status "pending" or "failed"
    - `type=history`: Shows transaction queues with status "completed" or "cancelled"
    - `type=recharge_game|redeem_game|add_user_game`: Filters by specific transaction type

Examples:
Detailed description:
- Transactions capture monetary movements (e.g., purchases/cashouts). Use `type` filters on `/transactions` (e.g., `purchase`, `cashout`). Game activities are queue-based async tasks (e.g., `recharge_game`, `redeem_game`, `create_game`) and include payload `data` and `remarks` for audit.

cURL:
```
curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transactions/?search=cashout"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transactions/?type=processing"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transactions/?type=history"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transactions/?txn=purchases"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transactions/?txn=cashouts"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transaction-queues/?type=recharge_game&status=pending"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transaction-queues/?type=processing"

curl -H "Authorization: Bearer <JWT>" \
  "https://<BE_DOMAIN>/api/v1/transaction-queues/?type=history"
```
- /api/v1/transactions/?search=cashout
- /api/v1/transactions/?type=processing
- /api/v1/transactions/?type=history
- /api/v1/transactions/?txn=purchases
- /api/v1/transactions/?txn=cashouts
- /api/v1/transaction-queues/?type=recharge_game&status=pending
- /api/v1/transaction-queues/?type=processing
- /api/v1/transaction-queues/?type=history

Processing sections
- Purchases, Cashouts: list via /transactions?type=purchase|cashout
- Pending purchases: list via /transactions?txn=purchases (pending purchase transactions, excludes game data)
- Pending cashouts: list via /transactions?txn=cashouts (pending cashout transactions, excludes game data)
- Processing transactions: list via /transactions?type=processing (pending/failed status)
- Historical transactions: list via /transactions?type=history (completed/cancelled status)
- Game activities: list via /transaction-queues
- Processing game activities: list via /transaction-queues?type=processing (pending/failed status)
- Historical game activities: list via /transaction-queues?type=history (completed/cancelled status)

Game Operations (existing)
Descriptions:
- add_user_game: queues creation of a game account and creates `UserGames` only when credentials succeed.
- recharge: deducts main balance, enqueues game top-up with bonus logic.
- redeem: returns game balance to main winning balance (with minimum thresholds if configured).
- reset_password: rotates game password via provider and updates local record.
- check_balance(_admin): fetches game balance for a user; admin variant supports checking others.
- check_store_balance: store-level balance for a given game/provider.

cURL examples:
```
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"game_id":1, "whitelabel_admin_uuid":"<uuid>"}' \
  https://<BE_DOMAIN>/games/add_user_game

curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"amount":100, "game_id":1, "whitelabel_admin_uuid":"<uuid>"}' \
  https://<BE_DOMAIN>/games/recharge
```
- POST /games/add_user_game
- POST /games/recharge
- POST /games/redeem
- POST /games/reset_password
- POST /games/check_balance
- POST /games/check_balance_admin
- POST /games/check_store_balance

Manual Actions
- POST /admin/handle-game-action
  - Form fields: txn_id, type in {retry, cancel, complete}
  - Notes: For add_user_game tasks, UserGames may not exist until success.
Example success:
cURL:
```
curl -X POST -H "Authorization: Bearer <JWT>" \
  -d "txn_id=123&type=retry" \
  https://<BE_DOMAIN>/admin/handle-game-action
```

Notes:
- `retry` re-queues the same Celery task; `cancel` marks cancelled and performs refunds/state rollbacks where applicable; `complete` marks success, optionally overrides `new_password` or `new_balance`.
{ "status": "success", "message": "Task retried successfully.", "task_id": "<celery-id>", "queue_id": 123 }

Error Format
- { "status": "error", "message": "..." }

Success Format
- { "status": "success", ... }

Auth Notes
- Ensure JWT or session is present; many endpoints require IsAuthenticated and role checks.

Bonuses and Settings (admins-only)
- Purchase Bonuses: CRUD at /api/v1/purchase-bonuses/
- Recharge Bonuses: GET/PUT/PATCH at /api/v1/recharge-bonuses/ (entries pre-created for all games)
- Transfer Bonuses: GET/PUT/PATCH at /api/v1/transfer-bonuses/ (single entry per admin)
- Signup Bonuses: GET/PUT/PATCH at /api/v1/signup-bonuses/ (single entry per admin)
- Affiliate defaults: GET/PUT/PATCH at /api/v1/affiliate-defaults/ (single entry per admin)

Admin Banners (admins-only)
- Admin Banners: CRUD at /api/v1/admin-banners/

Affiliates Management (admins-only)
- Affiliates: CRUD at /api/v1/affiliates/

Admin Banner Management
- GET /api/v1/admin-banners/ - List all admin banners
- POST /api/v1/admin-banners/ - Create new admin banner
- GET /api/v1/admin-banners/{id}/ - Get specific admin banner
- PUT /api/v1/admin-banners/{id}/ - Update admin banner (full update)
- PATCH /api/v1/admin-banners/{id}/ - Update admin banner (partial update)
- DELETE /api/v1/admin-banners/{id}/ - Delete admin banner

POST /api/v1/admin-banners/ - Create Admin Banner
Creates a new admin banner with separate images for web and mobile platforms.

Required Fields:
- `title`: Banner title/name (max 255 characters)
- `banner_type`: Type of banner ("HOMEPAGE" or "PROMOTIONAL")

Optional Fields:
- `banner_category`: Category of banner ("DESKTOP", "MOBILE_RESPONSIVE", or "MOBILE_APP") - defaults to "DESKTOP"
- `web_banner`: Image file for web/desktop platforms
- `mobile_banner`: Image file for mobile platforms
- `banner_thumbnail`: Legacy banner field for backward compatibility
- `redirect_url`: URL to redirect when banner is clicked (must start with http:// or https://)
- `is_active`: Whether the banner is currently active (defaults to true)

Request Example:
```json
{
  "title": "Welcome Banner",
  "banner_type": "HOMEPAGE",
  "banner_category": "DESKTOP",
  "redirect_url": "https://example.com/promotion",
  "is_active": true
}
```

Response Example (Success):
```json
{
  "id": 1,
  "title": "Welcome Banner",
  "banner_type": "HOMEPAGE",
  "banner_category": "DESKTOP",
  "web_banner": "http://example.com/media/banners/admin/web/banner.jpg",
  "mobile_banner": null,
  "banner_thumbnail": null,
  "redirect_url": "https://example.com/promotion",
  "is_active": true,
  "project": 1,
  "created_by": 1,
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-15T10:30:00Z"
}
```

Response Example (Error):
```json
{
  "title": ["This field is required."],
  "banner_type": ["This field is required."],
  "non_field_errors": ["At least one banner image (web_banner, mobile_banner, or banner_thumbnail) must be provided."]
}
```

Validation Rules:
- Title: Required, maximum 255 characters
- Banner Type: Required, must be "HOMEPAGE" or "PROMOTIONAL"
- Banner Category: Optional, must be "DESKTOP", "MOBILE_RESPONSIVE", or "MOBILE_APP"
- At least one banner image (web_banner, mobile_banner, or banner_thumbnail) must be provided
- Redirect URL: Must start with http:// or https:// if provided
- Images: Accepts PNG, JPEG, JPG formats

Permissions:
- Requires `IsAuthenticated` and role in {company, superadmin}
- Only company admins and superadmins can manage banners
- Banners are automatically associated with the creating admin's project

cURL Examples:

Create banner:
```bash
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{
    "title": "Welcome Banner",
    "banner_type": "HOMEPAGE",
    "banner_category": "DESKTOP",
    "redirect_url": "https://example.com/promotion",
    "is_active": true
  }' \
  https://<BE_DOMAIN>/api/v1/admin-banners/
```

List banners:
```bash
curl -H "Authorization: Bearer <JWT>" \
  https://<BE_DOMAIN>/api/v1/admin-banners/
```

Update banner:
```bash
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"is_active": false}' \
  https://<BE_DOMAIN>/api/v1/admin-banners/1/
```

Delete banner:
```bash
curl -X DELETE -H "Authorization: Bearer <JWT>" \
  https://<BE_DOMAIN>/api/v1/admin-banners/1/
```

Notes:
- Banners support separate images for web and mobile platforms for better user experience
- The `project` and `created_by` fields are automatically set based on the authenticated user
- Search functionality is available on title, banner_type, and banner_category fields
- Banners are ordered by creation date (newest first)
- Image uploads are handled through multipart/form-data requests

Affiliate Management
- GET /api/v1/affiliates/ - List all affiliate agents with financial stats
- GET /api/v1/affiliates/{id}/ - Get specific affiliate agent details
- PATCH /api/v1/affiliates/{id}/ - Update affiliate commission settings

GET /api/v1/affiliates/ - List Affiliate Agents
Lists all affiliate agents with their commission settings and financial statistics.

Response Example:
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 12,
      "name": "agent1",
      "email": "agent1@example.com",
      "affiliate_percentage": "10.00",
      "affiliate_fee": "2.00",
      "payment_method_fee": "5.00",
      "affiliate_link": "https://example.com/signup/?source=agent1",
      "total_players": 15,
      "total_earnings": 1250.50,
      "total_topup": 5000.00,
      "total_cashout": 2000.00,
      "created": "2024-01-15T10:30:00Z"
    },
    {
      "id": 13,
      "name": "agent2",
      "email": "agent2@example.com",
      "affiliate_percentage": "15.00",
      "affiliate_fee": "3.00",
      "payment_method_fee": "7.00",
      "affiliate_link": "https://example.com/signup/?source=agent2",
      "total_players": 8,
      "total_earnings": 850.25,
      "total_topup": 3000.00,
      "total_cashout": 1200.00,
      "created": "2024-01-16T11:45:00Z"
    }
  ]
}
```

Response Fields:
- `id`: Agent ID
- `name`: Agent username
- `email`: Agent email address
- `affiliate_percentage`: Commission percentage for the agent
- `affiliate_fee`: Fee percentage deducted from earnings
- `payment_method_fee`: Payment method fee percentage
- `affiliate_link`: Generated affiliate signup link
- `total_players`: Number of players affiliated with this agent
- `total_earnings`: Total earnings after fees (calculated)
- `total_topup`: Total topup amount from affiliated players
- `total_cashout`: Total cashout amount from affiliated players
- `created`: Agent creation date

Query Parameters:
- `search`: Search by agent username or email
- `page`, `page_size`: Standard pagination

PATCH /api/v1/affiliates/{id}/ - Update Affiliate Commission
Updates commission settings for a specific affiliate agent.

Request Example:
```json
{
  "affiliation_percentage": 12.5,
  "affiliation_fee_percentage": 2.5,
  "payment_method_fee_percentage": 6.0
}
```

Response Example (Success):
```json
{
  "status": "success",
  "message": "Affiliate commission settings updated successfully.",
  "data": {
    "id": 12,
    "name": "agent1",
    "email": "agent1@example.com",
    "affiliate_percentage": "12.50",
    "affiliate_fee": "2.50",
    "payment_method_fee": "6.00",
    "affiliate_link": "https://example.com/signup/?source=agent1",
    "total_players": 15,
    "total_earnings": 1250.50,
    "total_topup": 5000.00,
    "total_cashout": 2000.00,
    "created": "2024-01-15T10:30:00Z"
  }
}
```

Response Example (Error):
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "affiliation_percentage": ["Affiliation percentage must be between 0 and 100."]
  }
}
```

Validation Rules:
- `affiliation_percentage`: Must be between 0 and 100
- `affiliation_fee_percentage`: Must be between 0 and 100
- `payment_method_fee_percentage`: Must be between 0 and 100

Permissions:
- Requires `IsAuthenticated` and role in {company, superadmin}
- Only company admins and superadmins can view and update affiliate settings

cURL Examples:

List affiliates:
```bash
curl -H "Authorization: Bearer <JWT>" \
  https://<BE_DOMAIN>/api/v1/affiliates/?search=agent1
```

Update affiliate commission:
```bash
curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"affiliation_percentage": 12.5, "affiliation_fee_percentage": 2.5}' \
  https://<BE_DOMAIN>/api/v1/affiliates/12/
```

Notes:
- Only agents with affiliate links are shown in the list
- Financial stats are calculated in real-time based on affiliated players' transactions
- Earnings calculation: (total_topup - total_cashout) - fees
- All percentage fields are validated to be between 0 and 100
- Search functionality is available on agent username and email

Purchase Bonus create:
Response (example):
{ "id": 9, "user": 3, "topup_method": "bitcoin", "bonus_type": "percentage", "bonus": 10 }
Request:
{ "user": 3, "topup_method": "bitcoin", "bonus_type": "percentage", "bonus": 10 }

Recharge Bonus update:
Response (example):
{ "id": 57, "bonus_type": "percentage", "bonus": 15, "category": "game", "name": "Panda Master", "is_enabled": true, "on_min_deposit": false, "min_deposit_amount": null, "bonus_amount": "15.00", "display_text": "15% bonus" }
Request (PUT/PATCH):
{ "bonus_type": "percentage", "bonus": 15, "is_enabled": true, "on_min_deposit": false, "min_deposit_amount": null }

Transfer Bonus update:
Response (example):
{ "id": 13, "bonus_type": "percentage", "bonus": 5, "category": "transfer", "name": "Transfer Bonus", "is_enabled": true, "on_min_deposit": false, "min_deposit_amount": null, "bonus_amount": "5.00", "display_text": "5% bonus" }
Request (PUT/PATCH):
{ "bonus_type": "percentage", "bonus": 5, "is_enabled": true, "on_min_deposit": false, "min_deposit_amount": null }

Signup Bonus update:
Response (example):
{ "id": 14, "bonus_type": "fixed", "bonus": 50, "category": "signup", "name": "Welcome Bonus", "is_enabled": true, "on_min_deposit": false, "min_deposit_amount": null, "bonus_amount": "50.00", "display_text": "50.00 bonus" }
Request (PUT/PATCH):
{ "bonus_type": "fixed", "bonus": 50, "is_enabled": true, "on_min_deposit": false, "min_deposit_amount": null }

cURL examples:
```
curl -X POST -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"user":3, "topup_method":"bitcoin", "bonus_type":"percentage", "bonus":10}' \
  https://<BE_DOMAIN>/api/v1/purchase-bonuses/

curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"bonus_type":"percentage","bonus":15,"is_enabled":true,"on_min_deposit":false,"min_deposit_amount":null}' \
  https://<BE_DOMAIN>/api/v1/recharge-bonuses/57/

curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"bonus":5,"is_enabled":true}' \
  https://<BE_DOMAIN>/api/v1/transfer-bonuses/13/

curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"bonus_type":"fixed","bonus":50,"is_enabled":true}' \
  https://<BE_DOMAIN>/api/v1/signup-bonuses/14/

curl -X PATCH -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"default_affiliation_percentage":10.0,"default_fee_percentage":2.0,"default_payment_method_fee_percentage":5.0}' \
  https://<BE_DOMAIN>/api/v1/affiliate-defaults/1/
```

Notes:
- `PurchaseBonus` validations prevent duplicate non-tiered bonuses with same attributes.
- `RechargeBonus` (GlobalBonus with category="game") manages game-specific recharge bonuses. Each game has its own individual bonus entry. Entries are pre-created for all games during initialization, so only updates are supported.
- `TransferBonus` (GlobalBonus with category="transfer") manages bonuses for balance transfers between main and winnings accounts. Only one transfer bonus entry per admin, so only updates are supported.
- `SignupBonus` (GlobalBonus with category="signup") manages welcome bonuses for new user registrations. Only one signup bonus entry per admin, so only updates are supported.
- `DefaultAffiliateValues` manages default affiliate settings. Only one entry per admin, so only updates are supported.
- All bonus types include display helpers (e.g., `display_text`) in responses.
Request:
{ "default_affiliation_percentage": 10.0, "default_fee_percentage": 2.0, "default_payment_method_fee_percentage": 5.0 }



