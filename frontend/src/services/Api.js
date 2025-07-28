// src/services/api.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Set in your .env file
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Set in your .env file
const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication
export const login = async (phone, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const register = async ({ name, phone, password, nationalId }) => {
  const { data, error } = await supabase.auth.signUp({
    phone,
    password,
    options: { data: { name, nationalId } },
  });
  if (error) throw new Error(error.message);
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

// Catch Logs
export const createCatch = async (catchData) => {
  const { data, error } = await supabase
    .from('catches')
    .insert([{ ...catchData, created_at: new Date().toISOString() }]);
  if (error) throw new Error(error.message);
  return data;
};

export const getCatches = async () => {
  const { data, error } = await supabase.from('catches').select('*');
  if (error) throw new Error(error.message);
  return data;
};

// Market Listings
export const createListing = async (listingData) => {
  const { data, error } = await supabase
    .from('listings')
    .insert([{ ...listingData, created_at: new Date().toISOString() }]);
  if (error) throw new Error(error.message);
  return data;
};

export const getListings = async () => {
  const { data, error } = await supabase.from('listings').select('*');
  if (error) throw new Error(error.message);
  return data;
};

export default supabase;