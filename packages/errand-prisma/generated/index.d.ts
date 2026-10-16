
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Errand
 * 
 */
export type Errand = $Result.DefaultSelection<Prisma.$ErrandPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ErrandStatus: {
  OPEN: 'OPEN',
  ACCEPTED: 'ACCEPTED',
  PICKED_UP: 'PICKED_UP',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  CONFIRMED: 'CONFIRMED'
};

export type ErrandStatus = (typeof ErrandStatus)[keyof typeof ErrandStatus]

}

export type ErrandStatus = $Enums.ErrandStatus

export const ErrandStatus: typeof $Enums.ErrandStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Errands
 * const errands = await prisma.errand.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Errands
   * const errands = await prisma.errand.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.errand`: Exposes CRUD operations for the **Errand** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Errands
    * const errands = await prisma.errand.findMany()
    * ```
    */
  get errand(): Prisma.ErrandDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Errand: 'Errand'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "errand"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Errand: {
        payload: Prisma.$ErrandPayload<ExtArgs>
        fields: Prisma.ErrandFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ErrandFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ErrandFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>
          }
          findFirst: {
            args: Prisma.ErrandFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ErrandFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>
          }
          findMany: {
            args: Prisma.ErrandFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>[]
          }
          create: {
            args: Prisma.ErrandCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>
          }
          createMany: {
            args: Prisma.ErrandCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ErrandCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>[]
          }
          delete: {
            args: Prisma.ErrandDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>
          }
          update: {
            args: Prisma.ErrandUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>
          }
          deleteMany: {
            args: Prisma.ErrandDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ErrandUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ErrandUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>[]
          }
          upsert: {
            args: Prisma.ErrandUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ErrandPayload>
          }
          aggregate: {
            args: Prisma.ErrandAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateErrand>
          }
          groupBy: {
            args: Prisma.ErrandGroupByArgs<ExtArgs>
            result: $Utils.Optional<ErrandGroupByOutputType>[]
          }
          count: {
            args: Prisma.ErrandCountArgs<ExtArgs>
            result: $Utils.Optional<ErrandCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    errand?: ErrandOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model Errand
   */

  export type AggregateErrand = {
    _count: ErrandCountAggregateOutputType | null
    _avg: ErrandAvgAggregateOutputType | null
    _sum: ErrandSumAggregateOutputType | null
    _min: ErrandMinAggregateOutputType | null
    _max: ErrandMaxAggregateOutputType | null
  }

  export type ErrandAvgAggregateOutputType = {
    pickupLat: number | null
    pickupLng: number | null
    pickupFloorNumber: number | null
    targetLat: number | null
    targetLng: number | null
    targetFloorNumber: number | null
    serviceType: number | null
    creditAmount: number | null
  }

  export type ErrandSumAggregateOutputType = {
    pickupLat: number | null
    pickupLng: number | null
    pickupFloorNumber: number | null
    targetLat: number | null
    targetLng: number | null
    targetFloorNumber: number | null
    serviceType: number | null
    creditAmount: number | null
  }

  export type ErrandMinAggregateOutputType = {
    id: string | null
    requesterSub: string | null
    courierSub: string | null
    supplierId: string | null
    pickupLat: number | null
    pickupLng: number | null
    pickupBuildingName: string | null
    pickupFloorNumber: number | null
    targetLat: number | null
    targetLng: number | null
    targetBuildingName: string | null
    targetFloorNumber: number | null
    name: string | null
    supplierName: string | null
    serviceType: number | null
    deliveryDescription: string | null
    deliveryInstructions: string | null
    creditAmount: number | null
    status: $Enums.ErrandStatus | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ErrandMaxAggregateOutputType = {
    id: string | null
    requesterSub: string | null
    courierSub: string | null
    supplierId: string | null
    pickupLat: number | null
    pickupLng: number | null
    pickupBuildingName: string | null
    pickupFloorNumber: number | null
    targetLat: number | null
    targetLng: number | null
    targetBuildingName: string | null
    targetFloorNumber: number | null
    name: string | null
    supplierName: string | null
    serviceType: number | null
    deliveryDescription: string | null
    deliveryInstructions: string | null
    creditAmount: number | null
    status: $Enums.ErrandStatus | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ErrandCountAggregateOutputType = {
    id: number
    requesterSub: number
    courierSub: number
    supplierId: number
    pickupLat: number
    pickupLng: number
    pickupBuildingName: number
    pickupFloorNumber: number
    targetLat: number
    targetLng: number
    targetBuildingName: number
    targetFloorNumber: number
    name: number
    supplierName: number
    serviceType: number
    deliveryDescription: number
    deliveryInstructions: number
    creditAmount: number
    status: number
    expiresAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ErrandAvgAggregateInputType = {
    pickupLat?: true
    pickupLng?: true
    pickupFloorNumber?: true
    targetLat?: true
    targetLng?: true
    targetFloorNumber?: true
    serviceType?: true
    creditAmount?: true
  }

  export type ErrandSumAggregateInputType = {
    pickupLat?: true
    pickupLng?: true
    pickupFloorNumber?: true
    targetLat?: true
    targetLng?: true
    targetFloorNumber?: true
    serviceType?: true
    creditAmount?: true
  }

  export type ErrandMinAggregateInputType = {
    id?: true
    requesterSub?: true
    courierSub?: true
    supplierId?: true
    pickupLat?: true
    pickupLng?: true
    pickupBuildingName?: true
    pickupFloorNumber?: true
    targetLat?: true
    targetLng?: true
    targetBuildingName?: true
    targetFloorNumber?: true
    name?: true
    supplierName?: true
    serviceType?: true
    deliveryDescription?: true
    deliveryInstructions?: true
    creditAmount?: true
    status?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ErrandMaxAggregateInputType = {
    id?: true
    requesterSub?: true
    courierSub?: true
    supplierId?: true
    pickupLat?: true
    pickupLng?: true
    pickupBuildingName?: true
    pickupFloorNumber?: true
    targetLat?: true
    targetLng?: true
    targetBuildingName?: true
    targetFloorNumber?: true
    name?: true
    supplierName?: true
    serviceType?: true
    deliveryDescription?: true
    deliveryInstructions?: true
    creditAmount?: true
    status?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ErrandCountAggregateInputType = {
    id?: true
    requesterSub?: true
    courierSub?: true
    supplierId?: true
    pickupLat?: true
    pickupLng?: true
    pickupBuildingName?: true
    pickupFloorNumber?: true
    targetLat?: true
    targetLng?: true
    targetBuildingName?: true
    targetFloorNumber?: true
    name?: true
    supplierName?: true
    serviceType?: true
    deliveryDescription?: true
    deliveryInstructions?: true
    creditAmount?: true
    status?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ErrandAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Errand to aggregate.
     */
    where?: ErrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Errands to fetch.
     */
    orderBy?: ErrandOrderByWithRelationInput | ErrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ErrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Errands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Errands.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Errands
    **/
    _count?: true | ErrandCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ErrandAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ErrandSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ErrandMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ErrandMaxAggregateInputType
  }

  export type GetErrandAggregateType<T extends ErrandAggregateArgs> = {
        [P in keyof T & keyof AggregateErrand]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateErrand[P]>
      : GetScalarType<T[P], AggregateErrand[P]>
  }




  export type ErrandGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ErrandWhereInput
    orderBy?: ErrandOrderByWithAggregationInput | ErrandOrderByWithAggregationInput[]
    by: ErrandScalarFieldEnum[] | ErrandScalarFieldEnum
    having?: ErrandScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ErrandCountAggregateInputType | true
    _avg?: ErrandAvgAggregateInputType
    _sum?: ErrandSumAggregateInputType
    _min?: ErrandMinAggregateInputType
    _max?: ErrandMaxAggregateInputType
  }

  export type ErrandGroupByOutputType = {
    id: string
    requesterSub: string
    courierSub: string | null
    supplierId: string
    pickupLat: number
    pickupLng: number
    pickupBuildingName: string
    pickupFloorNumber: number
    targetLat: number
    targetLng: number
    targetBuildingName: string
    targetFloorNumber: number
    name: string
    supplierName: string
    serviceType: number
    deliveryDescription: string
    deliveryInstructions: string | null
    creditAmount: number
    status: $Enums.ErrandStatus
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    _count: ErrandCountAggregateOutputType | null
    _avg: ErrandAvgAggregateOutputType | null
    _sum: ErrandSumAggregateOutputType | null
    _min: ErrandMinAggregateOutputType | null
    _max: ErrandMaxAggregateOutputType | null
  }

  type GetErrandGroupByPayload<T extends ErrandGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ErrandGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ErrandGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ErrandGroupByOutputType[P]>
            : GetScalarType<T[P], ErrandGroupByOutputType[P]>
        }
      >
    >


  export type ErrandSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requesterSub?: boolean
    courierSub?: boolean
    supplierId?: boolean
    pickupLat?: boolean
    pickupLng?: boolean
    pickupBuildingName?: boolean
    pickupFloorNumber?: boolean
    targetLat?: boolean
    targetLng?: boolean
    targetBuildingName?: boolean
    targetFloorNumber?: boolean
    name?: boolean
    supplierName?: boolean
    serviceType?: boolean
    deliveryDescription?: boolean
    deliveryInstructions?: boolean
    creditAmount?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["errand"]>

  export type ErrandSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requesterSub?: boolean
    courierSub?: boolean
    supplierId?: boolean
    pickupLat?: boolean
    pickupLng?: boolean
    pickupBuildingName?: boolean
    pickupFloorNumber?: boolean
    targetLat?: boolean
    targetLng?: boolean
    targetBuildingName?: boolean
    targetFloorNumber?: boolean
    name?: boolean
    supplierName?: boolean
    serviceType?: boolean
    deliveryDescription?: boolean
    deliveryInstructions?: boolean
    creditAmount?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["errand"]>

  export type ErrandSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requesterSub?: boolean
    courierSub?: boolean
    supplierId?: boolean
    pickupLat?: boolean
    pickupLng?: boolean
    pickupBuildingName?: boolean
    pickupFloorNumber?: boolean
    targetLat?: boolean
    targetLng?: boolean
    targetBuildingName?: boolean
    targetFloorNumber?: boolean
    name?: boolean
    supplierName?: boolean
    serviceType?: boolean
    deliveryDescription?: boolean
    deliveryInstructions?: boolean
    creditAmount?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["errand"]>

  export type ErrandSelectScalar = {
    id?: boolean
    requesterSub?: boolean
    courierSub?: boolean
    supplierId?: boolean
    pickupLat?: boolean
    pickupLng?: boolean
    pickupBuildingName?: boolean
    pickupFloorNumber?: boolean
    targetLat?: boolean
    targetLng?: boolean
    targetBuildingName?: boolean
    targetFloorNumber?: boolean
    name?: boolean
    supplierName?: boolean
    serviceType?: boolean
    deliveryDescription?: boolean
    deliveryInstructions?: boolean
    creditAmount?: boolean
    status?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ErrandOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "requesterSub" | "courierSub" | "supplierId" | "pickupLat" | "pickupLng" | "pickupBuildingName" | "pickupFloorNumber" | "targetLat" | "targetLng" | "targetBuildingName" | "targetFloorNumber" | "name" | "supplierName" | "serviceType" | "deliveryDescription" | "deliveryInstructions" | "creditAmount" | "status" | "expiresAt" | "createdAt" | "updatedAt", ExtArgs["result"]["errand"]>

  export type $ErrandPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Errand"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      requesterSub: string
      courierSub: string | null
      supplierId: string
      pickupLat: number
      pickupLng: number
      pickupBuildingName: string
      pickupFloorNumber: number
      targetLat: number
      targetLng: number
      targetBuildingName: string
      targetFloorNumber: number
      name: string
      supplierName: string
      serviceType: number
      deliveryDescription: string
      deliveryInstructions: string | null
      creditAmount: number
      status: $Enums.ErrandStatus
      expiresAt: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["errand"]>
    composites: {}
  }

  type ErrandGetPayload<S extends boolean | null | undefined | ErrandDefaultArgs> = $Result.GetResult<Prisma.$ErrandPayload, S>

  type ErrandCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ErrandFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ErrandCountAggregateInputType | true
    }

  export interface ErrandDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Errand'], meta: { name: 'Errand' } }
    /**
     * Find zero or one Errand that matches the filter.
     * @param {ErrandFindUniqueArgs} args - Arguments to find a Errand
     * @example
     * // Get one Errand
     * const errand = await prisma.errand.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ErrandFindUniqueArgs>(args: SelectSubset<T, ErrandFindUniqueArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Errand that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ErrandFindUniqueOrThrowArgs} args - Arguments to find a Errand
     * @example
     * // Get one Errand
     * const errand = await prisma.errand.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ErrandFindUniqueOrThrowArgs>(args: SelectSubset<T, ErrandFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Errand that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandFindFirstArgs} args - Arguments to find a Errand
     * @example
     * // Get one Errand
     * const errand = await prisma.errand.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ErrandFindFirstArgs>(args?: SelectSubset<T, ErrandFindFirstArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Errand that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandFindFirstOrThrowArgs} args - Arguments to find a Errand
     * @example
     * // Get one Errand
     * const errand = await prisma.errand.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ErrandFindFirstOrThrowArgs>(args?: SelectSubset<T, ErrandFindFirstOrThrowArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Errands that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Errands
     * const errands = await prisma.errand.findMany()
     * 
     * // Get first 10 Errands
     * const errands = await prisma.errand.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const errandWithIdOnly = await prisma.errand.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ErrandFindManyArgs>(args?: SelectSubset<T, ErrandFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Errand.
     * @param {ErrandCreateArgs} args - Arguments to create a Errand.
     * @example
     * // Create one Errand
     * const Errand = await prisma.errand.create({
     *   data: {
     *     // ... data to create a Errand
     *   }
     * })
     * 
     */
    create<T extends ErrandCreateArgs>(args: SelectSubset<T, ErrandCreateArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Errands.
     * @param {ErrandCreateManyArgs} args - Arguments to create many Errands.
     * @example
     * // Create many Errands
     * const errand = await prisma.errand.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ErrandCreateManyArgs>(args?: SelectSubset<T, ErrandCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Errands and returns the data saved in the database.
     * @param {ErrandCreateManyAndReturnArgs} args - Arguments to create many Errands.
     * @example
     * // Create many Errands
     * const errand = await prisma.errand.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Errands and only return the `id`
     * const errandWithIdOnly = await prisma.errand.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ErrandCreateManyAndReturnArgs>(args?: SelectSubset<T, ErrandCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Errand.
     * @param {ErrandDeleteArgs} args - Arguments to delete one Errand.
     * @example
     * // Delete one Errand
     * const Errand = await prisma.errand.delete({
     *   where: {
     *     // ... filter to delete one Errand
     *   }
     * })
     * 
     */
    delete<T extends ErrandDeleteArgs>(args: SelectSubset<T, ErrandDeleteArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Errand.
     * @param {ErrandUpdateArgs} args - Arguments to update one Errand.
     * @example
     * // Update one Errand
     * const errand = await prisma.errand.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ErrandUpdateArgs>(args: SelectSubset<T, ErrandUpdateArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Errands.
     * @param {ErrandDeleteManyArgs} args - Arguments to filter Errands to delete.
     * @example
     * // Delete a few Errands
     * const { count } = await prisma.errand.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ErrandDeleteManyArgs>(args?: SelectSubset<T, ErrandDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Errands.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Errands
     * const errand = await prisma.errand.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ErrandUpdateManyArgs>(args: SelectSubset<T, ErrandUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Errands and returns the data updated in the database.
     * @param {ErrandUpdateManyAndReturnArgs} args - Arguments to update many Errands.
     * @example
     * // Update many Errands
     * const errand = await prisma.errand.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Errands and only return the `id`
     * const errandWithIdOnly = await prisma.errand.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ErrandUpdateManyAndReturnArgs>(args: SelectSubset<T, ErrandUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Errand.
     * @param {ErrandUpsertArgs} args - Arguments to update or create a Errand.
     * @example
     * // Update or create a Errand
     * const errand = await prisma.errand.upsert({
     *   create: {
     *     // ... data to create a Errand
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Errand we want to update
     *   }
     * })
     */
    upsert<T extends ErrandUpsertArgs>(args: SelectSubset<T, ErrandUpsertArgs<ExtArgs>>): Prisma__ErrandClient<$Result.GetResult<Prisma.$ErrandPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Errands.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandCountArgs} args - Arguments to filter Errands to count.
     * @example
     * // Count the number of Errands
     * const count = await prisma.errand.count({
     *   where: {
     *     // ... the filter for the Errands we want to count
     *   }
     * })
    **/
    count<T extends ErrandCountArgs>(
      args?: Subset<T, ErrandCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ErrandCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Errand.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ErrandAggregateArgs>(args: Subset<T, ErrandAggregateArgs>): Prisma.PrismaPromise<GetErrandAggregateType<T>>

    /**
     * Group by Errand.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ErrandGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ErrandGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ErrandGroupByArgs['orderBy'] }
        : { orderBy?: ErrandGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ErrandGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetErrandGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Errand model
   */
  readonly fields: ErrandFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Errand.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ErrandClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Errand model
   */
  interface ErrandFieldRefs {
    readonly id: FieldRef<"Errand", 'String'>
    readonly requesterSub: FieldRef<"Errand", 'String'>
    readonly courierSub: FieldRef<"Errand", 'String'>
    readonly supplierId: FieldRef<"Errand", 'String'>
    readonly pickupLat: FieldRef<"Errand", 'Float'>
    readonly pickupLng: FieldRef<"Errand", 'Float'>
    readonly pickupBuildingName: FieldRef<"Errand", 'String'>
    readonly pickupFloorNumber: FieldRef<"Errand", 'Int'>
    readonly targetLat: FieldRef<"Errand", 'Float'>
    readonly targetLng: FieldRef<"Errand", 'Float'>
    readonly targetBuildingName: FieldRef<"Errand", 'String'>
    readonly targetFloorNumber: FieldRef<"Errand", 'Int'>
    readonly name: FieldRef<"Errand", 'String'>
    readonly supplierName: FieldRef<"Errand", 'String'>
    readonly serviceType: FieldRef<"Errand", 'Int'>
    readonly deliveryDescription: FieldRef<"Errand", 'String'>
    readonly deliveryInstructions: FieldRef<"Errand", 'String'>
    readonly creditAmount: FieldRef<"Errand", 'Int'>
    readonly status: FieldRef<"Errand", 'ErrandStatus'>
    readonly expiresAt: FieldRef<"Errand", 'DateTime'>
    readonly createdAt: FieldRef<"Errand", 'DateTime'>
    readonly updatedAt: FieldRef<"Errand", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Errand findUnique
   */
  export type ErrandFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * Filter, which Errand to fetch.
     */
    where: ErrandWhereUniqueInput
  }

  /**
   * Errand findUniqueOrThrow
   */
  export type ErrandFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * Filter, which Errand to fetch.
     */
    where: ErrandWhereUniqueInput
  }

  /**
   * Errand findFirst
   */
  export type ErrandFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * Filter, which Errand to fetch.
     */
    where?: ErrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Errands to fetch.
     */
    orderBy?: ErrandOrderByWithRelationInput | ErrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Errands.
     */
    cursor?: ErrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Errands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Errands.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Errands.
     */
    distinct?: ErrandScalarFieldEnum | ErrandScalarFieldEnum[]
  }

  /**
   * Errand findFirstOrThrow
   */
  export type ErrandFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * Filter, which Errand to fetch.
     */
    where?: ErrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Errands to fetch.
     */
    orderBy?: ErrandOrderByWithRelationInput | ErrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Errands.
     */
    cursor?: ErrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Errands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Errands.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Errands.
     */
    distinct?: ErrandScalarFieldEnum | ErrandScalarFieldEnum[]
  }

  /**
   * Errand findMany
   */
  export type ErrandFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * Filter, which Errands to fetch.
     */
    where?: ErrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Errands to fetch.
     */
    orderBy?: ErrandOrderByWithRelationInput | ErrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Errands.
     */
    cursor?: ErrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Errands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Errands.
     */
    skip?: number
    distinct?: ErrandScalarFieldEnum | ErrandScalarFieldEnum[]
  }

  /**
   * Errand create
   */
  export type ErrandCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * The data needed to create a Errand.
     */
    data: XOR<ErrandCreateInput, ErrandUncheckedCreateInput>
  }

  /**
   * Errand createMany
   */
  export type ErrandCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Errands.
     */
    data: ErrandCreateManyInput | ErrandCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Errand createManyAndReturn
   */
  export type ErrandCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * The data used to create many Errands.
     */
    data: ErrandCreateManyInput | ErrandCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Errand update
   */
  export type ErrandUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * The data needed to update a Errand.
     */
    data: XOR<ErrandUpdateInput, ErrandUncheckedUpdateInput>
    /**
     * Choose, which Errand to update.
     */
    where: ErrandWhereUniqueInput
  }

  /**
   * Errand updateMany
   */
  export type ErrandUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Errands.
     */
    data: XOR<ErrandUpdateManyMutationInput, ErrandUncheckedUpdateManyInput>
    /**
     * Filter which Errands to update
     */
    where?: ErrandWhereInput
    /**
     * Limit how many Errands to update.
     */
    limit?: number
  }

  /**
   * Errand updateManyAndReturn
   */
  export type ErrandUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * The data used to update Errands.
     */
    data: XOR<ErrandUpdateManyMutationInput, ErrandUncheckedUpdateManyInput>
    /**
     * Filter which Errands to update
     */
    where?: ErrandWhereInput
    /**
     * Limit how many Errands to update.
     */
    limit?: number
  }

  /**
   * Errand upsert
   */
  export type ErrandUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * The filter to search for the Errand to update in case it exists.
     */
    where: ErrandWhereUniqueInput
    /**
     * In case the Errand found by the `where` argument doesn't exist, create a new Errand with this data.
     */
    create: XOR<ErrandCreateInput, ErrandUncheckedCreateInput>
    /**
     * In case the Errand was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ErrandUpdateInput, ErrandUncheckedUpdateInput>
  }

  /**
   * Errand delete
   */
  export type ErrandDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
    /**
     * Filter which Errand to delete.
     */
    where: ErrandWhereUniqueInput
  }

  /**
   * Errand deleteMany
   */
  export type ErrandDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Errands to delete
     */
    where?: ErrandWhereInput
    /**
     * Limit how many Errands to delete.
     */
    limit?: number
  }

  /**
   * Errand without action
   */
  export type ErrandDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Errand
     */
    select?: ErrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Errand
     */
    omit?: ErrandOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ErrandScalarFieldEnum: {
    id: 'id',
    requesterSub: 'requesterSub',
    courierSub: 'courierSub',
    supplierId: 'supplierId',
    pickupLat: 'pickupLat',
    pickupLng: 'pickupLng',
    pickupBuildingName: 'pickupBuildingName',
    pickupFloorNumber: 'pickupFloorNumber',
    targetLat: 'targetLat',
    targetLng: 'targetLng',
    targetBuildingName: 'targetBuildingName',
    targetFloorNumber: 'targetFloorNumber',
    name: 'name',
    supplierName: 'supplierName',
    serviceType: 'serviceType',
    deliveryDescription: 'deliveryDescription',
    deliveryInstructions: 'deliveryInstructions',
    creditAmount: 'creditAmount',
    status: 'status',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ErrandScalarFieldEnum = (typeof ErrandScalarFieldEnum)[keyof typeof ErrandScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'ErrandStatus'
   */
  export type EnumErrandStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ErrandStatus'>
    


  /**
   * Reference to a field of type 'ErrandStatus[]'
   */
  export type ListEnumErrandStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ErrandStatus[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    
  /**
   * Deep Input Types
   */


  export type ErrandWhereInput = {
    AND?: ErrandWhereInput | ErrandWhereInput[]
    OR?: ErrandWhereInput[]
    NOT?: ErrandWhereInput | ErrandWhereInput[]
    id?: UuidFilter<"Errand"> | string
    requesterSub?: StringFilter<"Errand"> | string
    courierSub?: StringNullableFilter<"Errand"> | string | null
    supplierId?: StringFilter<"Errand"> | string
    pickupLat?: FloatFilter<"Errand"> | number
    pickupLng?: FloatFilter<"Errand"> | number
    pickupBuildingName?: StringFilter<"Errand"> | string
    pickupFloorNumber?: IntFilter<"Errand"> | number
    targetLat?: FloatFilter<"Errand"> | number
    targetLng?: FloatFilter<"Errand"> | number
    targetBuildingName?: StringFilter<"Errand"> | string
    targetFloorNumber?: IntFilter<"Errand"> | number
    name?: StringFilter<"Errand"> | string
    supplierName?: StringFilter<"Errand"> | string
    serviceType?: IntFilter<"Errand"> | number
    deliveryDescription?: StringFilter<"Errand"> | string
    deliveryInstructions?: StringNullableFilter<"Errand"> | string | null
    creditAmount?: IntFilter<"Errand"> | number
    status?: EnumErrandStatusFilter<"Errand"> | $Enums.ErrandStatus
    expiresAt?: DateTimeFilter<"Errand"> | Date | string
    createdAt?: DateTimeFilter<"Errand"> | Date | string
    updatedAt?: DateTimeFilter<"Errand"> | Date | string
  }

  export type ErrandOrderByWithRelationInput = {
    id?: SortOrder
    requesterSub?: SortOrder
    courierSub?: SortOrderInput | SortOrder
    supplierId?: SortOrder
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupBuildingName?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetBuildingName?: SortOrder
    targetFloorNumber?: SortOrder
    name?: SortOrder
    supplierName?: SortOrder
    serviceType?: SortOrder
    deliveryDescription?: SortOrder
    deliveryInstructions?: SortOrderInput | SortOrder
    creditAmount?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ErrandWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ErrandWhereInput | ErrandWhereInput[]
    OR?: ErrandWhereInput[]
    NOT?: ErrandWhereInput | ErrandWhereInput[]
    requesterSub?: StringFilter<"Errand"> | string
    courierSub?: StringNullableFilter<"Errand"> | string | null
    supplierId?: StringFilter<"Errand"> | string
    pickupLat?: FloatFilter<"Errand"> | number
    pickupLng?: FloatFilter<"Errand"> | number
    pickupBuildingName?: StringFilter<"Errand"> | string
    pickupFloorNumber?: IntFilter<"Errand"> | number
    targetLat?: FloatFilter<"Errand"> | number
    targetLng?: FloatFilter<"Errand"> | number
    targetBuildingName?: StringFilter<"Errand"> | string
    targetFloorNumber?: IntFilter<"Errand"> | number
    name?: StringFilter<"Errand"> | string
    supplierName?: StringFilter<"Errand"> | string
    serviceType?: IntFilter<"Errand"> | number
    deliveryDescription?: StringFilter<"Errand"> | string
    deliveryInstructions?: StringNullableFilter<"Errand"> | string | null
    creditAmount?: IntFilter<"Errand"> | number
    status?: EnumErrandStatusFilter<"Errand"> | $Enums.ErrandStatus
    expiresAt?: DateTimeFilter<"Errand"> | Date | string
    createdAt?: DateTimeFilter<"Errand"> | Date | string
    updatedAt?: DateTimeFilter<"Errand"> | Date | string
  }, "id">

  export type ErrandOrderByWithAggregationInput = {
    id?: SortOrder
    requesterSub?: SortOrder
    courierSub?: SortOrderInput | SortOrder
    supplierId?: SortOrder
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupBuildingName?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetBuildingName?: SortOrder
    targetFloorNumber?: SortOrder
    name?: SortOrder
    supplierName?: SortOrder
    serviceType?: SortOrder
    deliveryDescription?: SortOrder
    deliveryInstructions?: SortOrderInput | SortOrder
    creditAmount?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ErrandCountOrderByAggregateInput
    _avg?: ErrandAvgOrderByAggregateInput
    _max?: ErrandMaxOrderByAggregateInput
    _min?: ErrandMinOrderByAggregateInput
    _sum?: ErrandSumOrderByAggregateInput
  }

  export type ErrandScalarWhereWithAggregatesInput = {
    AND?: ErrandScalarWhereWithAggregatesInput | ErrandScalarWhereWithAggregatesInput[]
    OR?: ErrandScalarWhereWithAggregatesInput[]
    NOT?: ErrandScalarWhereWithAggregatesInput | ErrandScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Errand"> | string
    requesterSub?: StringWithAggregatesFilter<"Errand"> | string
    courierSub?: StringNullableWithAggregatesFilter<"Errand"> | string | null
    supplierId?: StringWithAggregatesFilter<"Errand"> | string
    pickupLat?: FloatWithAggregatesFilter<"Errand"> | number
    pickupLng?: FloatWithAggregatesFilter<"Errand"> | number
    pickupBuildingName?: StringWithAggregatesFilter<"Errand"> | string
    pickupFloorNumber?: IntWithAggregatesFilter<"Errand"> | number
    targetLat?: FloatWithAggregatesFilter<"Errand"> | number
    targetLng?: FloatWithAggregatesFilter<"Errand"> | number
    targetBuildingName?: StringWithAggregatesFilter<"Errand"> | string
    targetFloorNumber?: IntWithAggregatesFilter<"Errand"> | number
    name?: StringWithAggregatesFilter<"Errand"> | string
    supplierName?: StringWithAggregatesFilter<"Errand"> | string
    serviceType?: IntWithAggregatesFilter<"Errand"> | number
    deliveryDescription?: StringWithAggregatesFilter<"Errand"> | string
    deliveryInstructions?: StringNullableWithAggregatesFilter<"Errand"> | string | null
    creditAmount?: IntWithAggregatesFilter<"Errand"> | number
    status?: EnumErrandStatusWithAggregatesFilter<"Errand"> | $Enums.ErrandStatus
    expiresAt?: DateTimeWithAggregatesFilter<"Errand"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Errand"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Errand"> | Date | string
  }

  export type ErrandCreateInput = {
    id?: string
    requesterSub: string
    courierSub?: string | null
    supplierId: string
    pickupLat: number
    pickupLng: number
    pickupBuildingName: string
    pickupFloorNumber: number
    targetLat: number
    targetLng: number
    targetBuildingName: string
    targetFloorNumber: number
    name: string
    supplierName: string
    serviceType: number
    deliveryDescription: string
    deliveryInstructions?: string | null
    creditAmount: number
    status?: $Enums.ErrandStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ErrandUncheckedCreateInput = {
    id?: string
    requesterSub: string
    courierSub?: string | null
    supplierId: string
    pickupLat: number
    pickupLng: number
    pickupBuildingName: string
    pickupFloorNumber: number
    targetLat: number
    targetLng: number
    targetBuildingName: string
    targetFloorNumber: number
    name: string
    supplierName: string
    serviceType: number
    deliveryDescription: string
    deliveryInstructions?: string | null
    creditAmount: number
    status?: $Enums.ErrandStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ErrandUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requesterSub?: StringFieldUpdateOperationsInput | string
    courierSub?: NullableStringFieldUpdateOperationsInput | string | null
    supplierId?: StringFieldUpdateOperationsInput | string
    pickupLat?: FloatFieldUpdateOperationsInput | number
    pickupLng?: FloatFieldUpdateOperationsInput | number
    pickupBuildingName?: StringFieldUpdateOperationsInput | string
    pickupFloorNumber?: IntFieldUpdateOperationsInput | number
    targetLat?: FloatFieldUpdateOperationsInput | number
    targetLng?: FloatFieldUpdateOperationsInput | number
    targetBuildingName?: StringFieldUpdateOperationsInput | string
    targetFloorNumber?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    supplierName?: StringFieldUpdateOperationsInput | string
    serviceType?: IntFieldUpdateOperationsInput | number
    deliveryDescription?: StringFieldUpdateOperationsInput | string
    deliveryInstructions?: NullableStringFieldUpdateOperationsInput | string | null
    creditAmount?: IntFieldUpdateOperationsInput | number
    status?: EnumErrandStatusFieldUpdateOperationsInput | $Enums.ErrandStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ErrandUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    requesterSub?: StringFieldUpdateOperationsInput | string
    courierSub?: NullableStringFieldUpdateOperationsInput | string | null
    supplierId?: StringFieldUpdateOperationsInput | string
    pickupLat?: FloatFieldUpdateOperationsInput | number
    pickupLng?: FloatFieldUpdateOperationsInput | number
    pickupBuildingName?: StringFieldUpdateOperationsInput | string
    pickupFloorNumber?: IntFieldUpdateOperationsInput | number
    targetLat?: FloatFieldUpdateOperationsInput | number
    targetLng?: FloatFieldUpdateOperationsInput | number
    targetBuildingName?: StringFieldUpdateOperationsInput | string
    targetFloorNumber?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    supplierName?: StringFieldUpdateOperationsInput | string
    serviceType?: IntFieldUpdateOperationsInput | number
    deliveryDescription?: StringFieldUpdateOperationsInput | string
    deliveryInstructions?: NullableStringFieldUpdateOperationsInput | string | null
    creditAmount?: IntFieldUpdateOperationsInput | number
    status?: EnumErrandStatusFieldUpdateOperationsInput | $Enums.ErrandStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ErrandCreateManyInput = {
    id?: string
    requesterSub: string
    courierSub?: string | null
    supplierId: string
    pickupLat: number
    pickupLng: number
    pickupBuildingName: string
    pickupFloorNumber: number
    targetLat: number
    targetLng: number
    targetBuildingName: string
    targetFloorNumber: number
    name: string
    supplierName: string
    serviceType: number
    deliveryDescription: string
    deliveryInstructions?: string | null
    creditAmount: number
    status?: $Enums.ErrandStatus
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ErrandUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    requesterSub?: StringFieldUpdateOperationsInput | string
    courierSub?: NullableStringFieldUpdateOperationsInput | string | null
    supplierId?: StringFieldUpdateOperationsInput | string
    pickupLat?: FloatFieldUpdateOperationsInput | number
    pickupLng?: FloatFieldUpdateOperationsInput | number
    pickupBuildingName?: StringFieldUpdateOperationsInput | string
    pickupFloorNumber?: IntFieldUpdateOperationsInput | number
    targetLat?: FloatFieldUpdateOperationsInput | number
    targetLng?: FloatFieldUpdateOperationsInput | number
    targetBuildingName?: StringFieldUpdateOperationsInput | string
    targetFloorNumber?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    supplierName?: StringFieldUpdateOperationsInput | string
    serviceType?: IntFieldUpdateOperationsInput | number
    deliveryDescription?: StringFieldUpdateOperationsInput | string
    deliveryInstructions?: NullableStringFieldUpdateOperationsInput | string | null
    creditAmount?: IntFieldUpdateOperationsInput | number
    status?: EnumErrandStatusFieldUpdateOperationsInput | $Enums.ErrandStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ErrandUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    requesterSub?: StringFieldUpdateOperationsInput | string
    courierSub?: NullableStringFieldUpdateOperationsInput | string | null
    supplierId?: StringFieldUpdateOperationsInput | string
    pickupLat?: FloatFieldUpdateOperationsInput | number
    pickupLng?: FloatFieldUpdateOperationsInput | number
    pickupBuildingName?: StringFieldUpdateOperationsInput | string
    pickupFloorNumber?: IntFieldUpdateOperationsInput | number
    targetLat?: FloatFieldUpdateOperationsInput | number
    targetLng?: FloatFieldUpdateOperationsInput | number
    targetBuildingName?: StringFieldUpdateOperationsInput | string
    targetFloorNumber?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    supplierName?: StringFieldUpdateOperationsInput | string
    serviceType?: IntFieldUpdateOperationsInput | number
    deliveryDescription?: StringFieldUpdateOperationsInput | string
    deliveryInstructions?: NullableStringFieldUpdateOperationsInput | string | null
    creditAmount?: IntFieldUpdateOperationsInput | number
    status?: EnumErrandStatusFieldUpdateOperationsInput | $Enums.ErrandStatus
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type EnumErrandStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ErrandStatus | EnumErrandStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumErrandStatusFilter<$PrismaModel> | $Enums.ErrandStatus
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ErrandCountOrderByAggregateInput = {
    id?: SortOrder
    requesterSub?: SortOrder
    courierSub?: SortOrder
    supplierId?: SortOrder
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupBuildingName?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetBuildingName?: SortOrder
    targetFloorNumber?: SortOrder
    name?: SortOrder
    supplierName?: SortOrder
    serviceType?: SortOrder
    deliveryDescription?: SortOrder
    deliveryInstructions?: SortOrder
    creditAmount?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ErrandAvgOrderByAggregateInput = {
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetFloorNumber?: SortOrder
    serviceType?: SortOrder
    creditAmount?: SortOrder
  }

  export type ErrandMaxOrderByAggregateInput = {
    id?: SortOrder
    requesterSub?: SortOrder
    courierSub?: SortOrder
    supplierId?: SortOrder
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupBuildingName?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetBuildingName?: SortOrder
    targetFloorNumber?: SortOrder
    name?: SortOrder
    supplierName?: SortOrder
    serviceType?: SortOrder
    deliveryDescription?: SortOrder
    deliveryInstructions?: SortOrder
    creditAmount?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ErrandMinOrderByAggregateInput = {
    id?: SortOrder
    requesterSub?: SortOrder
    courierSub?: SortOrder
    supplierId?: SortOrder
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupBuildingName?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetBuildingName?: SortOrder
    targetFloorNumber?: SortOrder
    name?: SortOrder
    supplierName?: SortOrder
    serviceType?: SortOrder
    deliveryDescription?: SortOrder
    deliveryInstructions?: SortOrder
    creditAmount?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ErrandSumOrderByAggregateInput = {
    pickupLat?: SortOrder
    pickupLng?: SortOrder
    pickupFloorNumber?: SortOrder
    targetLat?: SortOrder
    targetLng?: SortOrder
    targetFloorNumber?: SortOrder
    serviceType?: SortOrder
    creditAmount?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumErrandStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ErrandStatus | EnumErrandStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumErrandStatusWithAggregatesFilter<$PrismaModel> | $Enums.ErrandStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumErrandStatusFilter<$PrismaModel>
    _max?: NestedEnumErrandStatusFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumErrandStatusFieldUpdateOperationsInput = {
    set?: $Enums.ErrandStatus
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumErrandStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ErrandStatus | EnumErrandStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumErrandStatusFilter<$PrismaModel> | $Enums.ErrandStatus
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedEnumErrandStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ErrandStatus | EnumErrandStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ErrandStatus[] | ListEnumErrandStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumErrandStatusWithAggregatesFilter<$PrismaModel> | $Enums.ErrandStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumErrandStatusFilter<$PrismaModel>
    _max?: NestedEnumErrandStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}