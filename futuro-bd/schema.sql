-- CUNEF FC · esquema relacional (Tabla 2 del Word)
-- Las claves foráneas (REFERENCES) son las relaciones del modelo; SQLite las
-- hace cumplir porque db.js ejecuta PRAGMA foreign_keys = ON.
--
-- Este archivo es el "plano" de la base de datos: qué tablas hay y qué columnas tiene cada una.
-- NO contiene datos (los datos de ejemplo están en seed.js). db.js lo ejecuta al arrancar.
-- Vocabulario:
--   PRIMARY KEY AUTOINCREMENT  id único que SQLite asigna solo (1, 2, 3...).
--   NOT NULL                   la columna es obligatoria.
--   UNIQUE                     no puede haber dos filas con el mismo valor (p. ej. dos emails iguales).
--   CHECK (...)                regla que debe cumplirse; si no, la BD rechaza el INSERT/UPDATE.
--   REFERENCES tabla(col)      clave foránea: el valor debe existir en la otra tabla.
--   ON DELETE CASCADE          si se borra la fila "padre", se borran también sus "hijas".
-- OJO: si cambias una tabla que ya existe, "IF NOT EXISTS" no la actualiza. Borra
-- data/cunef-fc.db (o ejecuta "npm run seed" tras borrarlo) para que se cree de nuevo.

CREATE TABLE IF NOT EXISTS teams (
    team_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL UNIQUE,
    stadium        TEXT,
    creation_date  TEXT                              -- YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS players (
    player_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name   TEXT NOT NULL,
    shirt_number  INTEGER,
    description   TEXT,
    goals         INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
    assists       INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
    appearances   INTEGER NOT NULL DEFAULT 0 CHECK (appearances >= 0),
    height        INTEGER,                           -- cm
    weight        INTEGER,                           -- kg
    dob           TEXT,                              -- YYYY-MM-DD
    position      TEXT NOT NULL CHECK (position IN ('goalkeeper','defender','fullback','midfielder','forward')),
    team_id       INTEGER NOT NULL REFERENCES teams(team_id),   -- PLAYER belongs to one TEAM
    status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','injured')),
    UNIQUE (team_id, shirt_number)
);

CREATE TABLE IF NOT EXISTS matches (
    match_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id     INTEGER NOT NULL REFERENCES teams(team_id),
    away_team_id     INTEGER NOT NULL REFERENCES teams(team_id),
    match_date       TEXT NOT NULL,                  -- YYYY-MM-DDTHH:MM (hora local)
    location         TEXT,
    home_goals       INTEGER CHECK (home_goals >= 0),
    away_goals       INTEGER CHECK (away_goals >= 0),
    callup_published INTEGER NOT NULL DEFAULT 0 CHECK (callup_published IN (0,1)),
    CHECK (home_team_id <> away_team_id),
    CHECK ((home_goals IS NULL) = (away_goals IS NULL))  -- resultado completo o vacío
);
-- Status (upcoming | played) NO se guarda: se deriva de home_goals IS NULL.

-- USERS: aquí viven los ROLES. Cada usuario tiene un role: 'fan', 'player' o 'admin'.
--   * Por defecto 'fan' (es lo que crea el formulario de registro).
--   * La contraseña NUNCA se guarda tal cual: se guarda su hash bcrypt (texto irreversible).
--   * Un 'player' debe estar enlazado a su ficha de jugador (player_id), así el servidor sabe
--     qué asistencias son "suyas". El CHECK de abajo lo obliga.
--   * Para convertir a alguien en admin/player se cambia directamente en la BD (ver seed.js).
CREATE TABLE IF NOT EXISTS users (
    user_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash  TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'fan' CHECK (role IN ('fan','player','admin')),
    player_id      INTEGER UNIQUE REFERENCES players(player_id),  -- USER linked to at most one PLAYER
    CHECK (role <> 'player' OR player_id IS NOT NULL)             -- role player => linked to a PLAYER
);

CREATE TABLE IF NOT EXISTS news (
    news_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    information  TEXT NOT NULL,
    author_id    INTEGER NOT NULL REFERENCES users(user_id),      -- NEWS belongs to one USER
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS training_sessions (
    session_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date  TEXT NOT NULL,                     -- YYYY-MM-DD
    start_time    TEXT NOT NULL,                     -- HH:MM
    location      TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('tactical','physical','recovery')),
    notes         TEXT,
    is_public     INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0,1)),
    created_by    INTEGER NOT NULL REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS attendances (
    attendance_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id     INTEGER NOT NULL REFERENCES training_sessions(session_id) ON DELETE CASCADE,
    player_id      INTEGER NOT NULL REFERENCES players(player_id),
    status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','absent','injured')),
    reason         TEXT,
    UNIQUE (session_id, player_id)
);

CREATE TABLE IF NOT EXISTS callups (
    callup_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id   INTEGER NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    player_id  INTEGER NOT NULL REFERENCES players(player_id),
    role       TEXT NOT NULL CHECK (role IN ('starter','substitute')),
    UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_players_team      ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date      ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_home      ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away      ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_news_created      ON news(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_date     ON training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendances_player ON attendances(player_id);
