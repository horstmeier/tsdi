import {initialize, Injector, instance} from "../src/index";
import "mocha"
import {expect} from "chai"

@instance() 
class TestBase {
    public static index = 0;
    public constructor() {
        TestBase.index += 1;
    }
    public get name() {
        return "TestBase";
    }
}

@instance("TestBase")
class Test {
    private testBaseName: string;
    public constructor(testBase: TestBase) {
        this.testBaseName = testBase.name;
    }
    public get name() {
        return "Test";
    }
    public get baseName() {
        return this.testBaseName;
    }
}


@instance("TestBase", "Test")
class TestExt extends Test{
    public constructor(testBase: TestBase, test: Test) {
        super(TestBase);
    }
    public get name() {
        return "TestExt";
    }
}

@instance("Test[]")
class TestMultiple {
    public length: number = 0;
    public constructor(ts: Test[]) {
        this.length = ts.length;
    }
    public get name() {
        return "TestMultiple";
    }
}

describe("Injector", () => {
    it("Should resolve dependencies", async () => {
        let injector = new Injector();
        injector.register("TestBase", TestBase);
        injector.register("Test", Test);
        let obj = await injector.resolve("Test");
        expect(obj.name).to.equal("Test");
        expect(obj.baseName).to.equal("TestBase");
    });
    it("Should create a new instnce for each invocation", async () => {
        let injector = new Injector();
        injector.register("TestBase", TestBase);
        injector.register("Test", Test);
        injector.register("TestExt", TestExt);
        TestBase.index = 0;
        let obj = await injector.resolve("TestExt");
        expect(obj.name).to.equal("TestExt");
        expect(obj.baseName).to.equal("TestBase");  
        expect(TestBase.index).to.equal(2);     
    });
    it("Should work with the [] marker", async () => {
        let injector = new Injector();
        injector.register("TestBase", TestBase);
        injector.register("Test", Test);
        injector.register("Test", TestExt);
        injector.register("TestMultiple", TestMultiple)
        let obj: TestMultiple = await injector.resolve("TestMultiple");
        expect(obj.name).to.equal("TestMultiple");
        expect(obj.length).to.equal(2);
    });
})
