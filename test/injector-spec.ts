import {initialize, Injector, instance} from "../src/index";

interface ILog {
    info(msg: string);
}

@instance()
class Log implements ILog {
    private static index = 0;
    private myIndex = 0;

    constructor() {
        this.myIndex = Log.index++;
    }

    public info(msg: string) {
        console.log("INFO", this.myIndex, msg);
    }
}

@instance("Log")
class Test1 {
    private log: ILog;
    private static index = 0;
    private myIndex: number;
    constructor(log: ILog) {
        this.log = log;
        this.myIndex = Test1.index++;
        this.log.info("AA " + this.myIndex);
    }    
}

@instance("Log", "Test1")
export class Test {
    private static index = 0;
    private myIndex: number;
    private log: ILog;
    constructor(log: ILog, test1: Test1) {
        this.log = log;
        this.myIndex = Test.index++;
    }

    public print() {
        this.log.info("Hello " + this.myIndex);
    }

    @initialize
    public init() {
        this.log.info("Initializing...");
    }
}

let injector = new Injector();

injector.registerSingleton("Log", Log);
injector.register("Test", Test);
injector.register("Test", Test);
injector.register("Test1", Test1);

injector.resolveAll("Test").then((obj: Test[]) => {
    obj[0].print();
    obj[1].print();
})