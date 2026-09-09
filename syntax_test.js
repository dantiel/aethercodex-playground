// Test file to verify JavaScript syntax
class TestClass {
    constructor() {
        this.test = "working";
    }
    
    testMethod() {
        console.log("Method works");
    }
    
    applyZCollisions(noodle, noodleIndex) {
        // Test method structure
        for (let i = noodleIndex + 1; i < 10; i++) {
            console.log("Collision check");
        }
    }
}

// Test instantiation
const test = new TestClass();
test.testMethod();