
import * as _ from "lodash";
import "reflect-metadata";

const classMetadataKey = Symbol("injector-class");
const initMetadataKey = Symbol("injector-init");
export const infoMetadataKey = Symbol("injector-info");

export type DependencyDeclaration = { name: string; meta: any };
export type Dependency = string | DependencyDeclaration

export function instance(...dependencies: Dependency[]) {
    return (constructor: Function) => {
        Reflect.defineMetadata(classMetadataKey, { 
            dependencies: dependencies,
        }, constructor);
    }
}

export function initialize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(initMetadataKey, {name: propertyKey}, target, propertyKey);
}

type ClassMetadata = {
    constructor: Function,
    singleton: boolean;
    dependencies: string[];
    valueExists: boolean;
    value: any
}

export class Injector {
    private registeredClasses: {[name: string]: ClassMetadata[] } = {};

    public constructor(readonly verbose?: boolean|undefined) {
    }

    public register(name: string, constructor: Function) {
        this._register(false, name, constructor, false, null);
    }

    public registerSingleton(name: string, constructor: Function) {
        this._register(true, name, constructor, false, null);
    }

    public registerValue(name: string, value: any) {
        this._register(true, name, null, true, value);
    }

    public async resolve(name: string, meta:any = {}): Promise<any> {
        
        this.log("Resolving", name);
        let result = await this.resolveDefinition(this.retrieveClassMetadata(name)[0], meta);
        this.log("Resolving", name, "done");
        return result;
    }
    
    public async resolveAll(name: string, meta: any = {}): Promise<any[]> {
        let def = this.retrieveClassMetadata(name);
        let result: any[] = [];
        for (let it of def) {
            result.push(await this.resolveDefinition(it, meta));
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

    private async resolveDefinition(def: ClassMetadata, meta: any) {
        if (def.singleton && def.valueExists) {
            return def.value;
        }
        let dependencies = [];
        for (let it of def.dependencies) {
            let dependency: Dependency = it;
            let declaration = (typeof dependency === "string") ? {name: it, meta: {}} : dependency;
            let ds = await (declaration.name.endsWith("[]") ? 
                this.resolveAll(declaration.name.substr(0, it.length-2).trim(), declaration.meta) 
                : this.resolve(declaration.name, declaration.meta));
            dependencies.push(ds);
        }

        let result = Reflect.construct(def.constructor, dependencies);
console.log(`Setting ${JSON.stringify(meta)} to ${JSON.stringify(result)}`);
        Reflect.defineMetadata(infoMetadataKey, meta, result);
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

    private log(...msg: string[]) {
        if (this.verbose) {
            console.log(_.reduce(msg, (acc, it) => acc + it + " ", ""));
        }        
    }

}
