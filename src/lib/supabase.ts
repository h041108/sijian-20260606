/**
 * Supabase 客户端
 * 用于存储思维空间历史、用户数据
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表结构（SQL 建表语句见 schema.sql）
// - mind_spaces: 存储用户的思维空间记录
// - users: 用户信息（通过 Supabase Auth）
