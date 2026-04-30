declare module 'lovefield' {
  namespace lf {
    interface Database {
      getSchema(): schema.Database;
      select(...columns: unknown[]): query.Select;
      insert(): query.Insert;
      insertOrReplace(): query.Insert;
      delete(): query.Delete;
      update(table: schema.Table): query.Update;
      export(): Promise<unknown>;
      close(): void;
    }

    namespace schema {
      interface Builder {
        createTable(name: string): TableBuilder;
        connect(options?: ConnectOptions): Promise<lf.Database>;
      }

      interface ConnectOptions {
        storeType?: number;
      }

      interface TableBuilder {
        addColumn(name: string, type: unknown): TableBuilder;
        addPrimaryKey(columns: string[], autoIncrement?: boolean): TableBuilder;
        addForeignKey(name: string, spec: ForeignKeySpec): TableBuilder;
        addNullable(columns: string[]): TableBuilder;
        addIndex(name: string, columns: string[]): TableBuilder;
        addUnique(name: string, columns: string[]): TableBuilder;
      }

      interface ForeignKeySpec {
        local: string;
        ref: string;
        action: unknown;
      }

      interface Database {
        table(name: string): Table;
      }

      interface Table {
        [column: string]: Column;
        as(alias: string): Table;
        createRow(data: Record<string, unknown>): Row;
      }

      interface Column {
        eq(value: unknown): Predicate;
        neq(value: unknown): Predicate;
        lt(value: unknown): Predicate;
        lte(value: unknown): Predicate;
        gt(value: unknown): Predicate;
        gte(value: unknown): Predicate;
        match(regex: RegExp): Predicate;
        between(from: unknown, to: unknown): Predicate;
        in(values: unknown[]): Predicate;
        isNull(): Predicate;
        isNotNull(): Predicate;
      }

      function create(name: string, version: number): Builder;
    }

    namespace query {
      interface Select {
        from(...tables: schema.Table[]): Select;
        where(predicate: Predicate): Select;
        innerJoin(table: schema.Table, predicate: Predicate): Select;
        leftOuterJoin(table: schema.Table, predicate: Predicate): Select;
        orderBy(column: schema.Column, order?: unknown): Select;
        groupBy(...columns: schema.Column[]): Select;
        limit(count: number): Select;
        skip(count: number): Select;
        exec(): Promise<unknown[]>;
      }

      interface Insert {
        into(table: schema.Table): Insert;
        values(rows: Row[]): Insert;
        exec(): Promise<unknown[]>;
      }

      interface Delete {
        from(table: schema.Table): Delete;
        where(predicate: Predicate): Delete;
        exec(): Promise<unknown[]>;
      }

      interface Update {
        set(column: schema.Column, value: unknown): Update;
        where(predicate: Predicate): Update;
        exec(): Promise<unknown[]>;
      }
    }

    namespace op {
      function and(...predicates: Predicate[]): Predicate;
      function or(...predicates: Predicate[]): Predicate;
      function not(predicate: Predicate): Predicate;
    }

    namespace fn {
      function count(column?: schema.Column): unknown;
      function sum(column: schema.Column): unknown;
      function avg(column: schema.Column): unknown;
      function min(column: schema.Column): unknown;
      function max(column: schema.Column): unknown;
    }

    interface Predicate {}
    interface Row {}

    const Type: {
      INTEGER: unknown;
      STRING: unknown;
      BOOLEAN: unknown;
      DATE_TIME: unknown;
      OBJECT: unknown;
      NUMBER: unknown;
    };

    const Order: {
      ASC: unknown;
      DESC: unknown;
    };

    const ConstraintAction: {
      RESTRICT: unknown;
      CASCADE: unknown;
    };
  }

  export = lf;
}
