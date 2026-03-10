create table hbt_categorias (
    id bigint generated always as identity primary key,
    
    usuario_id uuid references auth.users(id) on delete cascade,
    
    nome varchar(100) not null,
    
    criado_em timestamptz default now(),
    atualizado_em timestamptz default now()
);

create index idx_hbt_categorias_usuario
on hbt_categorias (usuario_id);



create table hbt_cores (
    id bigint generated always as identity primary key,
    usuario_id uuid not null references auth.users(id) on delete cascade,
    nome varchar(50) not null,
    hex varchar(7) not null,
    criado_em timestamptz default now(),
    atualizado_em timestamptz default now()
);

create unique index idx_hbt_cores_usuario_hex
on hbt_cores (usuario_id, hex);

insert into hbt_cores (usuario_id, nome, hex)
values
('b50135ad-9a83-4eff-a899-e66adc652f95', 'Vermelho', '#ef4444'),
('b50135ad-9a83-4eff-a899-e66adc652f95', 'Verde', '#22c55e'),
('b50135ad-9a83-4eff-a899-e66adc652f95', 'Azul', '#3b82f6'),
('b50135ad-9a83-4eff-a899-e66adc652f95', 'Amarelo', '#eab308'),
('b50135ad-9a83-4eff-a899-e66adc652f95', 'Roxo', '#a855f7');