import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fqwhagryqkkhbgznxtwf.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInJlZiI6ImZxd2hhZ3J5cWtraGJnem54dHdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc2NTg2MiwiZXhwIjoyMDk1MzQxODYyfQ.q4CPA1yamPM-vyQgatrc3V8XIjPcVZkwn0qtxb0WgeQ";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAudits() {
  console.log("═════════════════════════════════════════════════════════════");
  console.log("TICKET 1: PDFs Cotizaciones — AUDITORÍA");
  console.log("═════════════════════════════════════════════════════════════\n");

  // 1. Count PDFs in Storage
  console.log("Query 1: Count PDFs in storage.objects (cotizaciones bucket)...");
  try {
    const { data: storageData, error: storageError } = await supabase.rpc(
      "get_storage_pdf_count"
    );
    if (storageError) {
      console.log("  (RPC not available, will check via direct query)");
      const { data, error } = await supabase.from("storage.objects").select("*").like("name", "%.pdf");
      if (error) console.error("  Error:", error);
      else console.log(`  📁 PDFs in storage: ${data?.length || 0}`);
    } else {
      console.log(`  📁 PDFs in storage: ${storageData}`);
    }
  } catch (e) {
    console.error("  Exception:", e);
  }

  // 2. Count cotizaciones with pdf_url
  console.log(
    "\nQuery 2: Count cotizaciones with pdf_url (Supabase vs otros)..."
  );
  try {
    const tenants = [
      "1cb97ec7-326c-4376-93ee-ed317d3da51b",
      "6f4c923a-c3b7-47c2-9dea-2a187f274f73",
    ];
    const { data: cotizaciones, error } = await supabase
      .from("cotizaciones")
      .select("id,codigo,pdf_url", { count: "exact" })
      .in("tenant_id", tenants);

    if (error) {
      console.error("  Error:", error);
    } else {
      const total = cotizaciones?.length || 0;
      const con_pdf_url = cotizaciones?.filter(
        (c) => c.pdf_url && c.pdf_url !== ""
      ).length;
      const en_supabase = cotizaciones?.filter((c) =>
        c.pdf_url?.includes("supabase")
      ).length;
      const en_otros = con_pdf_url - en_supabase;

      console.log(`  📊 Total cotizaciones: ${total}`);
      console.log(`  📄 Con pdf_url: ${con_pdf_url}`);
      console.log(`  ☁️  En Supabase: ${en_supabase}`);
      console.log(`  🔗 En otros: ${en_otros}`);

      if (en_otros > 0) {
        console.log(
          "\n  Sample de cotizaciones con pdf_url en otros (primeras 5):"
        );
        cotizaciones
          ?.filter((c) => c.pdf_url && !c.pdf_url.includes("supabase"))
          .slice(0, 5)
          .forEach((c) => {
            console.log(`    - ${c.codigo}: ${c.pdf_url?.substring(0, 80)}`);
          });
      }
    }
  } catch (e) {
    console.error("  Exception:", e);
  }

  console.log(
    "\n═════════════════════════════════════════════════════════════"
  );
  console.log("TICKET 2: tareas_recursos — AUDITORÍA");
  console.log("═════════════════════════════════════════════════════════════\n");

  // 1. Total tareas + con recursos
  console.log("Query 1: Total tareas activas vs con recursos...");
  try {
    const tenants = [
      "1cb97ec7-326c-4376-93ee-ed317d3da51b",
      "6f4c923a-c3b7-47c2-9dea-2a187f274f73",
    ];
    const { data: tareas, error } = await supabase
      .from("tareas")
      .select(
        `
        id,
        codigo,
        tareas_recursos(id)
      `,
        { count: "exact" }
      )
      .in("tenant_id", tenants)
      .eq("is_active", true);

    if (error) {
      console.error("  Error:", error);
    } else {
      const total = tareas?.length || 0;
      const con_recursos = tareas?.filter(
        (t) => t.tareas_recursos && t.tareas_recursos.length > 0
      ).length;
      const pct = total > 0 ? ((con_recursos / total) * 100).toFixed(2) : "0";

      console.log(`  📋 Total tareas activas: ${total}`);
      console.log(`  ✅ Con recursos: ${con_recursos} (${pct}%)`);
      console.log(`  ❌ Sin recursos: ${total - con_recursos}`);

      if (total - con_recursos > 0) {
        console.log("\n  Tareas SIN recursos (primeras 10):");
        tareas
          ?.filter(
            (t) => !t.tareas_recursos || t.tareas_recursos.length === 0
          )
          .slice(0, 10)
          .forEach((t) => {
            console.log(`    - ${t.codigo}: ${t.id}`);
          });
      }
    }
  } catch (e) {
    console.error("  Exception:", e);
  }

  // 2. FK validation
  console.log("\nQuery 2: FK validation (maquinarias & profiles)...");
  try {
    const { data: orphans, error } = await supabase
      .from("tareas_recursos")
      .select("*", { count: "exact" });

    if (error) {
      console.error("  Error:", error);
    } else {
      console.log(`  ⚙️  Total tareas_recursos: ${orphans?.length || 0}`);
      console.log(`  ✅ FK validation will be checked in next step`);
    }
  } catch (e) {
    console.error("  Exception:", e);
  }

  console.log("\n═════════════════════════════════════════════════════════════");
  console.log("✅ Audit complete!");
  console.log("═════════════════════════════════════════════════════════════");
}

runAudits().catch(console.error);
