-- ============================================================
-- 思见 · Supabase 数据库 Schema
-- 初次部署：在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. 思维空间表
create table if not exists mind_spaces (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  input_text text not null,
  mind_space_json jsonb not null,
  -- 方便查询的字段
  node_count int generated always as (
    jsonb_array_length(mind_space_json->'nodes')
  ) stored,
  edge_count int generated always as (
    jsonb_array_length(mind_space_json->'edges')
  ) stored,
  created_at timestamptz default now()
);

-- 索引：按用户和时间查询
create index idx_mind_spaces_user_id on mind_spaces(user_id);
create index idx_mind_spaces_created_at on mind_spaces(created_at desc);

-- 启用 RLS（行级安全）
alter table mind_spaces enable row level security;

-- 用户只能看到自己的思维空间
create policy "用户只能操作自己的思维空间"
  on mind_spaces
  for all
  using (auth.uid() = user_id);

-- 2. 用户思维成长数据表
create table if not exists user_growth (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  -- 累计生成次数
  total_generations int default 0,
  -- 本周生成次数
  weekly_generations int default 0,
  -- 累计节点数
  total_nodes int default 0,
  -- 当前思维等级
  level text default '青铜',
  -- 最近活动时间
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table user_growth enable row level security;

create policy "用户只能查看自己的成长数据"
  on user_growth
  for all
  using (auth.uid() = user_id);

-- 3. 更新用户活跃时间的函数
create or replace function update_user_growth()
returns trigger as $$
begin
  insert into user_growth (user_id, total_generations, weekly_generations, total_nodes, last_active_at)
  values (
    new.user_id,
    1,
    1,
    jsonb_array_length(new.mind_space_json->'nodes'),
    now()
  )
  on conflict (user_id) do update set
    total_generations = user_growth.total_generations + 1,
    weekly_generations = user_growth.weekly_generations + 1,
    total_nodes = user_growth.total_nodes + jsonb_array_length(new.mind_space_json->'nodes'),
    last_active_at = now();
  return new;
end;
$$ language plpgsql;

-- 自动更新用户成长
create trigger after_mind_space_insert
  after insert on mind_spaces
  for each row
  execute function update_user_growth();
