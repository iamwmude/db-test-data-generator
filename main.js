import Sequelize from 'sequelize';
const { DataTypes } = Sequelize;

const db = new Sequelize({
    dialect: 'postgres',
    username: 'root',
    password: '123456',
    database: 'db',
    host: 'localhost',
    port: 7777,
    define: {
        timestamps: false,
    },
    logging: false,
    connectionTimeout: 0,
    pool: {
        max: parseInt(process.env.DB_POOL_SIZE || '5'),
        min: 0,
        idle: 10000,
        acquire: 5000,
        timeout: 10000,
    },
});

async function getAllTableNames() {
    const result = await db.query(
        `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
    );

    if (result && result.length) return result[0];

    return [];
}

async function getTableAllColumns(tableName) {
    const result = await db.query(
        `SELECT * FROM information_schema.columns WHERE table_name = '${tableName}';`
    );

    if (result && result.length) return result[0];

    return [];
}

function getModelAttrs(columns) {
    const modelAttrs = {};
    columns.forEach((column) => {
        const attr = {
            allowNull: column['is_nullable'] === 'YES' ? true : false,
        };

        if (
            column['column_default'] &&
            column['column_default'].indexOf('nextval') > -1
        ) {
            attr.primaryKey = true;
            attr.autoIncrement = true;
        }

        if (column['data_type'].indexOf('interger')) {
            attr.type = DataTypes.INTEGER;
        } else if (column['data_type'].indexOf('character varying')) {
            attr.type = DataTypes.STRING;
        } else if (column['data_type'].indexOf('timestamp')) {
            attr.type = DataTypes.DATE;
        }

        modelAttrs[column['column_name']] = attr;
    });

    return modelAttrs;
}

function randomDate(start, end) {
    return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    ).toUTCString();
}

function randomString(length) {
    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return new Array(length)
        .fill()
        .map(() =>
            characters.charAt(Math.floor(Math.random() * characters.length))
        )
        .join('');
}

async function generateData(tableName, columns, rowCount) {
    const mod = db.define(tableName, getModelAttrs(columns));
    const data = [];
    for (let i = 0; i < rowCount; i++) {
        const row = {};
        columns.forEach((column) => {
            if (
                column['column_default'] &&
                column['column_default'].indexOf('nextval') > -1
            )
                return;

            let val;
            if (column['data_type'].indexOf('interger') > -1) {
                val = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            } else if (column['data_type'].indexOf('character varying') > -1) {
                const stringLength = Math.floor(
                    Math.random() * column['character_maximum_length']
                );
                val = randomString(stringLength);
            } else if (column['data_type'].indexOf('timestamp') > -1) {
                val = randomDate(new Date(1991, 0, 1), new Date());
            }

            row[column['column_name']] = val;
        });
        data.push(row);
    }
    await mod.bulkCreate(data, {
        ignoreDuplicates: true,
    });
}

async function main() {
    const tables = await getAllTableNames();
    for (let idx = 0; idx < tables.length; idx++) {
        const tableName = tables[idx]['table_name'];
        const columns = await getTableAllColumns(tableName);
        await generateData(tableName, columns, 10000);
    }

    console.log('Done');
}

main();

// column_default:'nextval('accounts_user_id_seq'::regclass)'

// column_name:'user_id'

// data_type:'integer'
// data_type:'character varying'
// data_type:'timestamp without time zone'

// character_maximum_length:255
// character_maximum_length:null

// is_nullable:'NO'
// is_nullable:'YES'
