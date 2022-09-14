import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableForeignKey,
  } from 'typeorm';
  
  export class createTableEdgeRsuObu1652070264353 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.createTable(
        new Table({
          name: 'edge',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'name',
              isNullable: false,
              isUnique: true,
              type: 'varchar',
            },
            {
              name: 'createdAt',
              type: 'timestamptz',
              default: 'now()',
            },
            {
              name: 'updatedAt',
              type: 'timestamptz',
              default: 'now()',
            },
          ],
        }),
        true,
      );
      
      await queryRunner.createTable(
        new Table({
          name: 'rsu',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'name',
              isNullable: false,
              isUnique: true,
              type: 'varchar',
            },
            {
              name: 'cpu',
              isNullable: false,
              type: 'int',
            },
            {
              name: 'ram',
              isNullable: false,
              type: 'int',
            },
            {
              name: 'tx',
              isNullable: false,
              type: 'int',
            },
            {
              name: 'rx',
              isNullable: false,
              type: 'int',
            },
            {
              name: 'edgeId',
              isNullable: false,
              type: 'int',
            },
            {
              name: 'createdAt',
              type: 'timestamptz',
              default: 'now()',
            },
            {
              name: 'updatedAt',
              type: 'timestamptz',
              default: 'now()',
            },
          ],
        }),
        true,
      );