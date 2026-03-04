import { getIbadahMonthEntries } from './app/dashboard/awardee/ibadah/harian/actions';

async function run() {
    console.log("Testing Nov 2025...");
    const resNov = await getIbadahMonthEntries(11, 2025, true);
    console.log("Nov 2025 Result:", JSON.stringify(resNov));

    console.log("Testing Dec 2025...");
    const resDec = await getIbadahMonthEntries(12, 2025, true);
    console.log("Dec 2025 Result:", JSON.stringify(resDec));
}
run().catch(console.error);
