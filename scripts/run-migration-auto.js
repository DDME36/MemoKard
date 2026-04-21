#!/usr/bin/env node

/**
 * Automatic Migration Runner
 * This script runs the migration SQL directly via Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env');
  process.exit(1);
}

console.log('🚀 Running Community Deck Sharing Migration');
console.log('==========================================\n');

console.log('⚠️  NOTE: This script uses the anon key which has limited permissions.');
console.log('For full migration, please run the SQL manually in Supabase SQL Editor.\n');

console.log('📋 Migration Instructions:');
console.log('1. Open Supabase SQL Editor:');
console.log(`   ${supabaseUrl}/project/_/sql\n`);
console.log('2. Copy the contents of: supabase-community-sharing.sql');
console.log('3. Paste into SQL Editor and click "Run"\n');

console.log('✅ After running the migration, test it with:');
console.log('   npm run migration:test\n');

// Try to create tables (will likely fail with anon key, but worth trying)
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('decks').select('id').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('✅ Supabase connection successful\n');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function checkIfMigrated() {
  console.log('🔍 Checking if migration already ran...');
  
  try {
    const { error } = await supabase.from('public_decks').select('id').limit(1);
    
    if (!error || error.code === 'PGRST116') {
      console.log('✅ Migration already completed!\n');
      console.log('Run "npm run migration:test" to verify.\n');
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('ℹ️  Migration not yet run\n');
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot connect to Supabase. Please check your credentials.\n');
    process.exit(1);
  }
  
  const migrated = await checkIfMigrated();
  
  if (migrated) {
    process.exit(0);
  }
  
  console.log('📝 To run the migration:');
  console.log('1. Open: ' + supabaseUrl + '/project/_/sql');
  console.log('2. Copy: supabase-community-sharing.sql');
  console.log('3. Paste and click "Run"');
  console.log('4. Run: npm run migration:test\n');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
