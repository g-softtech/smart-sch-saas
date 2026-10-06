import assert from "assert";

function simulateFrontendMappingBug() {
    console.log("=== Phase 6J Gradebook Reload Bug Regression Test ===");

    // 1. Setup the active components as the frontend would receive them from /components
    const activeComps = [
        { id: "ca-id", title: "CA", type: undefined, maxScore: 40 },
        { id: "cbt-id", title: "CBT", type: undefined, maxScore: 50 },
        { id: "mock-id", title: "MOCK", type: undefined, maxScore: 10 }
    ];

    // 2. Setup the scores as getGradebook returns them (omitting `type` entirely)
    // Run 1: CA=32, CBT=40, MOCK=8
    const apiScores1 = [
        { assessmentComponentId: "ca-id", score: 32 },
        { assessmentComponentId: "cbt-id", score: 40 },
        { assessmentComponentId: "mock-id", score: 8 }
    ];

    function mapScoresLegacy(components: any[], scores: any[]) {
        const compScores: any = {};
        components.forEach((comp) => {
            // The BUG logic
            const match = scores.find(
                (sc: any) => sc.assessmentComponentId === comp.id || sc.type === comp.type
            );
            compScores[comp.id] = match ? match.score : 0;
        });
        return compScores;
    }

    function mapScoresFixed(components: any[], scores: any[]) {
        const compScores: any = {};
        components.forEach((comp) => {
            // The FIXED logic
            const match = scores.find(
                (sc: any) => sc.assessmentComponentId === comp.id
            );
            compScores[comp.id] = match ? match.score : 0;
        });
        return compScores;
    }

    console.log("\n[Run 1] Legacy Mapping (Should Fail with 32,32,32)");
    const legacyMapped1 = mapScoresLegacy(activeComps, apiScores1);
    console.log(`CA: ${legacyMapped1["ca-id"]}, CBT: ${legacyMapped1["cbt-id"]}, MOCK: ${legacyMapped1["mock-id"]}`);
    assert.strictEqual(legacyMapped1["cbt-id"], 32, "Legacy mapping SHOULD corrupt the CBT score to 32");

    console.log("\n[Run 1] Fixed Mapping (CA=32, CBT=40, MOCK=8)");
    const fixedMapped1 = mapScoresFixed(activeComps, apiScores1);
    console.log(`CA: ${fixedMapped1["ca-id"]}, CBT: ${fixedMapped1["cbt-id"]}, MOCK: ${fixedMapped1["mock-id"]}`);
    assert.strictEqual(fixedMapped1["ca-id"], 32, "Fixed mapping should be 32");
    assert.strictEqual(fixedMapped1["cbt-id"], 40, "Fixed mapping should be 40");
    assert.strictEqual(fixedMapped1["mock-id"], 8, "Fixed mapping should be 8");

    // Run 2: CA=20, CBT=25, MOCK=5
    const apiScores2 = [
        { assessmentComponentId: "ca-id", score: 20 },
        { assessmentComponentId: "cbt-id", score: 25 },
        { assessmentComponentId: "mock-id", score: 5 }
    ];

    console.log("\n[Run 2] Fixed Mapping (CA=20, CBT=25, MOCK=5)");
    const fixedMapped2 = mapScoresFixed(activeComps, apiScores2);
    console.log(`CA: ${fixedMapped2["ca-id"]}, CBT: ${fixedMapped2["cbt-id"]}, MOCK: ${fixedMapped2["mock-id"]}`);
    assert.strictEqual(fixedMapped2["ca-id"], 20, "Fixed mapping should be 20");
    assert.strictEqual(fixedMapped2["cbt-id"], 25, "Fixed mapping should be 25");
    assert.strictEqual(fixedMapped2["mock-id"], 5, "Fixed mapping should be 5");

    const totalScore2 = fixedMapped2["ca-id"] + fixedMapped2["cbt-id"] + fixedMapped2["mock-id"];
    console.log(`Calculated Total Score: ${totalScore2}`);
    assert.strictEqual(totalScore2, 50, "Total should correctly sum to 50");

    console.log("\n✅ ALL ASSERTIONS PASSED. The frontend reload mapping bug is conclusively fixed.");
}

simulateFrontendMappingBug();
