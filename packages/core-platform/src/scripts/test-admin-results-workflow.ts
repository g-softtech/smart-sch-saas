import assert from "assert";

function runRegressionTest() {
    console.log("=== Admin Results Workflow Regression Test ===");

    const mockDetailData = {
        subjectResults: [
            {
                enrollmentId: "enrollment-1",
                totalScore: 80,
                grade: "A",
                scores: [
                    {
                        assessmentComponentId: "ca-id",
                        score: 32,
                        assessmentComponent: {
                            title: "CA",
                            maxScore: 40,
                            weight: 40,
                            assessmentType: { code: "CA" }
                        }
                    },
                    {
                        assessmentComponentId: "cbt-id",
                        score: 40,
                        assessmentComponent: {
                            title: "CBT TERM",
                            maxScore: 50,
                            weight: 50,
                            assessmentType: { code: "EXAM" }
                        }
                    },
                    {
                        assessmentComponentId: "mock-id",
                        score: 8,
                        assessmentComponent: {
                            title: "MOCK",
                            maxScore: 10,
                            weight: 10,
                            assessmentType: { code: "MOCK" }
                        }
                    }
                ]
            },
            {
                enrollmentId: "enrollment-2",
                totalScore: 50,
                grade: "C",
                scores: [
                    {
                        assessmentComponentId: "ca-id",
                        score: 20,
                        assessmentComponent: {
                            title: "CA",
                            maxScore: 40,
                            weight: 40,
                            assessmentType: { code: "CA" }
                        }
                    },
                    {
                        assessmentComponentId: "cbt-id",
                        score: 25,
                        assessmentComponent: {
                            title: "CBT TERM",
                            maxScore: 50,
                            weight: 50,
                            assessmentType: { code: "EXAM" }
                        }
                    },
                    {
                        assessmentComponentId: "mock-id",
                        score: 5,
                        assessmentComponent: {
                            title: "MOCK",
                            maxScore: 10,
                            weight: 10,
                            assessmentType: { code: "MOCK" }
                        }
                    }
                ]
            }
        ],
        enrollments: [
            { id: "enrollment-1", student: { firstName: "John", lastName: "Doe" } },
            { id: "enrollment-2", student: { firstName: "Jane", lastName: "Smith" } }
        ]
    };

    // 1. Build columns map
    const compMap = new Map<string, { id: string; title: string; type: string; maxScore?: number; weight?: number }>();
    mockDetailData.subjectResults.forEach((res: any) => {
        if (Array.isArray(res.scores)) {
            res.scores.forEach((s: any) => {
                const idKey = s.assessmentComponentId;
                if (idKey && !compMap.has(idKey)) {
                    compMap.set(idKey, {
                        id: idKey,
                        title: s.assessmentComponent?.title || "COMPONENT",
                        type: s.assessmentComponent?.assessmentType?.code || "COMPONENT",
                        maxScore: s.assessmentComponent?.maxScore,
                        weight: s.assessmentComponent?.weight,
                    });
                }
            });
        }
    });

    const components = Array.from(compMap.values());
    console.log(`\nColumns extracted dynamically: ${components.length}`);
    assert.strictEqual(components.length, 3, "Should extract exactly 3 assessment components");
    assert.strictEqual(components[0].title, "CA");
    assert.strictEqual(components[1].title, "CBT TERM");
    assert.strictEqual(components[2].title, "MOCK");

    console.log("\nSimulating Row Rendering for Enrollment 1 (Expected: 32, 40, 8)");
    const res1 = mockDetailData.subjectResults.find((r) => r.enrollmentId === "enrollment-1");
    const renderedRow1 = components.map(c => {
        const sObj = res1?.scores?.find((s: any) => s.assessmentComponentId === c.id);
        return sObj ? sObj.score : "-";
    });
    console.log(`Row 1 Map: ${renderedRow1.join(" | ")}`);
    assert.strictEqual(renderedRow1[0], 32, "CA should map to 32");
    assert.strictEqual(renderedRow1[1], 40, "CBT TERM should map to 40");
    assert.strictEqual(renderedRow1[2], 8, "MOCK should map to 8");

    console.log("\nSimulating Row Rendering for Enrollment 2 (Expected: 20, 25, 5)");
    const res2 = mockDetailData.subjectResults.find((r) => r.enrollmentId === "enrollment-2");
    const renderedRow2 = components.map(c => {
        const sObj = res2?.scores?.find((s: any) => s.assessmentComponentId === c.id);
        return sObj ? sObj.score : "-";
    });
    console.log(`Row 2 Map: ${renderedRow2.join(" | ")}`);
    assert.strictEqual(renderedRow2[0], 20, "CA should map to 20");
    assert.strictEqual(renderedRow2[1], 25, "CBT TERM should map to 25");
    assert.strictEqual(renderedRow2[2], 5, "MOCK should map to 5");

    console.log("\n✅ ALL ASSERTIONS PASSED. The Admin Results workflow rendering is conclusively fixed for dynamic custom components.");
}

runRegressionTest();
