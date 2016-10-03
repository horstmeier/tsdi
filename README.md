# An experiment in Typescript, Dependency Injection and Decorators

Some people argue that languages like Typescript, Javascript, Python and so on don't need dependency injection 
because of the dynamic structure of the language. There may be some points in these arguments but I believe nevertheless,
that a formal dependency injection mechanism is helpful in many cases. I like Javascript and in particular Typescriptand have
done quite a few, even very large, project in these languages and have implemented a few ad-hoc implementations form
dependency injection, but never was satisfied with the result completely.

This experiment is another approach to the problem. It uses decorators as base for describing dependencies.

# The instance decorator

If you want to include a class in the dependency injection mechanism, you have to add the @instance decorator to it.
```javascript
@instance()
class Log: ILog {
    public info(msg: string) {
        console.log(msg);
    }
}
```

You register the class with the Injector class:

```javascript
let injector = new Injector();
injector.register("ILog", Log);

If you define another class that uses the Log class, you would write the following:

@instance("ILog")
class UseLog {
    constructor(readonly log: ILog) {

    }
}
```

You can register more than one class with the same name, thus if you would add the line
```Javascript
injector.register("ILog", Log2)
```
the class UseLog above would get one of the definitions (currently the one defined in the first call,
but this may change).

You can also retrieve all instances for a name by using the "[]" postfix at the injection point:
```javascript
@instance("ILog[]") 
class UseLog2 {
    constructor(readonly logs: ILog[]) {

    }
}
```
# The initialize decorator

When using node, you will frequently have the problem, that you need asynchronous actions perfomed during object construction. This is
currently not possible with Typescript. I implemented a simple protocol to allow for such initializations, whitch is far from perfect, 
but gets the job done. You mark one (or more) methods and the Injector class will make sure that these functions will be called before
the object is returned.

```javascript
@instance("ILog")
class LogUser {
    private rootFiles: string[];
    constructor(readonly log: ILog) {}
    @initialize
    async init() {
        this.rootFiles = await fs.readdir("/")
    }
}
```
# Building objects

The Injector class exports the members "resolve" and "resolveAll" that can be used to create objects. The differenc is that "resolve"
will return (and construct) only one of the objects registered with the given name, while "resolveAll" will return all of them.

```javascript
injector.resolve("ILog");
```
# Singletons

Singletons can be registered with "registerSingleton". The syntax is identical to "register". The system will make sure that at most 
one instance for a singleton is created.