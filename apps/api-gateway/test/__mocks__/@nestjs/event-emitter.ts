import { Injectable, Module, Global } from "@nestjs/common";

@Injectable()
export class EventEmitter2 {
  emit() {
    return true;
  }
  emitAsync() {
    return Promise.resolve(true);
  }
  on() {}
}

@Global()
@Module({
  providers: [EventEmitter2],
  exports: [EventEmitter2],
})
export class EventEmitterModule {
  static forRoot() {
    return {
      module: EventEmitterModule,
    };
  }
}

export function OnEvent() {
  return function (target: any, key: string | symbol, descriptor: PropertyDescriptor) {
    return descriptor;
  };
}
