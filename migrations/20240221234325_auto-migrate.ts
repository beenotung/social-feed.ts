import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {

  if (!(await knex.schema.hasTable('page'))) {
    await knex.schema.createTable('page', table => {
      table.increments('id')
      table.text('slug').notNullable().unique()
      table.text('posts').nullable()
      table.text('followers').nullable()
      table.text('following').nullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('post'))) {
    await knex.schema.createTable('post', table => {
      table.increments('id')
      table.integer('page_id').unsigned().notNullable().references('page.id')
      table.text('slug').notNullable().unique()
      table.text('alt').notNullable()
      table.integer('position').notNullable()
      table.timestamps(false, true)
    })
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('post')
  await knex.schema.dropTableIfExists('page')
}
