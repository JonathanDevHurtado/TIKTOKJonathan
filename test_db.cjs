const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oizhlnhojsdrqpgwxvcu.supabase.co',
  'REDACTED_SUPABASE_ANON_KEY'
);

async function test() {
  const { data, error } = await supabase.from('notifications').select('*').limit(1);
  console.log("Check if we can select notifications:", error || "Yes");
}

test();
