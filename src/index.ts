
import * as _ from "lodash";
import "reflect-metadata";

const classMetadataKey = Symbol("injector-class");
const initMetadataKey = Symbol("injector-init");

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


function instance(...dependencies: string[]) {
    return (constructor: Function) => {
        Reflect.defineMetadata(classMetadataKey, { 
            dependencies: dependencies,
        }, constructor);
    }
}

function initialize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(initMetadataKey, {name: propertyKey}, target, propertyKey);
}

type ClassMetadata = {
    constructor: Function,
    singleton: boolean;
    dependencies: string[];
    valueExists: boolean;
    value: any
}

class Injector {
    private registeredClasses: {[name: string]: ClassMetadata[] } = {};

    public register(name: string, constructor: Function) {
        this._register(false, name, constructor, false, null);
    }

    public registerSingleton(name: string, constructor: Function) {
        this._register(true, name, constructor, false, null);
    }

    public registerValue(name: string, value: any) {
        this._register(true, name, null, true, value);
    }

    public async resolve(name: string): Promise<any> {
        
        console.log("Resolving", name);
        let result = await this.resolveDefinition(this.retrieveClassMetadata(name)[0]);
        
        console.log("Resolving", name, "done");
        return result;
    }
    
    public async resolveAll(name: string): Promise<any[]> {
        let def = this.retrieveClassMetadata(name);
        let result: any[] = [];
        for (let it of def) {
            result.push(await this.resolveDefinition(it));
        }
        return result;
    }

    private _register(singleton: boolean, name: string, constructor: Function, valueExists: boolean, value: any) {
        let data: any = constructor ? Reflect.getMetadata(classMetadataKey, constructor) : [];
        if (!this.registeredClasses[name]) {
            this.registeredClasses[name] = [];
        }
        this.registeredClasses[name].push({
            constructor: constructor,
            singleton: singleton,
            dependencies: data.dependencies,
            valueExists: valueExists,
            value: null,
        });
    }
    
    private retrieveClassMetadata(name: string) {
        if (!this.registeredClasses[name]) {
            throw new Error(`${name} is not registered`);
        }
        return this.registeredClasses[name];      
    }

    private async resolveDefinition(def: ClassMetadata) {
        if (def.singleton && def.valueExists) {
            return def.value;
        }

        let dependencies = [];
        for (let it of def.dependencies) {
            dependencies.push(await this.resolve(it));
        }

        let result = Reflect.construct(def.constructor, dependencies);
        let methods = Object.getOwnPropertyNames(Object.getPrototypeOf(result));
        
        for (let method of methods) {
            if (Reflect.getMetadata(initMetadataKey, result, method)) {
                await result[method]();
            }
        }

        if (def.singleton) {
            def.valueExists = true;
            def.value = result;

        }

        return result;
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


