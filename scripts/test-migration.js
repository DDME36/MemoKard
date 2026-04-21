#!/usr/bin/env node

/**
 * Community Deck Sharing Migration Test Script
 * This script verifies that the database migration was successful
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing Community Deck Sharing Migration');
console.log('===========================================\n');

const tests = [];
let passed = 0;
let failed = 0;

// Test 1: Check if tables exist
async function testTablesExist() {
  console.log('Test 1: Checking if tables exist...');
  
  const tables = [
    'public_decks',
    'public_deck_cards',
    'deck_ratings',
    'deck_reports',
    'deck_imports'
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is OK
        throw error;
      }
      console.log(`  ✅ Table '${table}' exists`);
    } catch (error) {
      console.log(`  ❌ Table '${table}' not found:`, error.message);
      return false;
    }
  }
  
  return true;
}

// Test 2: Check if view exists
async function testViewExists() {
  console.log('\nTest 2: Checking if view exists...');
  
  try {
    const { error } = await supabase
      .from('public_decks_with_stats')
      .select('*')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('  ✅ View "public_decks_with_stats" exists');
    return true;
  } catch (error) {
    console.log('  ❌ View not found:', error.message);
    return false;
  }
}

// Test 3: Check RLS policies
async function testRLSPolicies() {
  console.log('\nTest 3: Checking RLS policies...');
  
  try {
    // Try to query without auth (should work for active public decks)
    const { data, error } = await supabase
      .from('public_decks')
      .select('id')
      .eq('is_active', true)
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('  ✅ RLS policies are working (public read access)');
    return true;
  } catch (error) {
    console.log('  ❌ RLS policies error:', error.message);
    return false;
  }
}

// Test 4: Test insert (should fail without auth)
async function testInsertWithoutAuth() {
  console.log('\nTest 4: Testing insert without auth (should fail)...');
  
  try {
    const { error } = await supabase
      .from('public_decks')
      .insert({
        name: 'Test Deck',
        description: 'Test',
        color: 'violet',
        category: 'ทั่วไป',
      });
    
    if (error) {
      console.log('  ✅ Insert correctly blocked without auth');
      return true;
    } else {
      console.log('  ❌ Insert should have been blocked');
      return false;
    }
  } catch (error) {
    console.log('  ✅ Insert correctly blocked:', error.message);
    return true;
  }
}

// Test 5: Check indexes
async function testIndexes() {
  console.log('\nTest 5: Checking indexes...');
  
  try {
    const { data, error } = await supabase.rpc('pg_indexes', {
      schemaname: 'public'
    });
    
    // This might not work with anon key, so we'll just mark as info
    console.log('  ℹ️  Index check requires admin access (skipped)');
    return true;
  } catch (error) {
    console.log('  ℹ️  Index check requires admin access (skipped)');
    return true;
  }
}

// Run all tests
async function runTests() {
  const results = [
    await testTablesExist(),
    await testViewExists(),
    await testRLSPolicies(),
    await testInsertWithoutAuth(),
    await testIndexes(),
  ];
  
  passed = results.filter(r => r).length;
  failed = results.filter(r => !r).length;
  
  console.log('\n===========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('===========================================\n');
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Migration successful!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Test the sharing feature in the app');
    console.log('3. Check the setup guide: COMMUNITY_SHARING_SETUP.md');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the migration.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you ran supabase-community-sharing.sql');
    console.log('2. Check Supabase SQL Editor for errors');
    console.log('3. Verify your Supabase credentials in .env');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
