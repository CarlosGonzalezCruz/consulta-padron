import * as endpoints from "./endpoints.js";
import * as properties from "./properties.js";
import * as logging from "./logging.js";
import * as db from "./db-queries.js";

properties.initProperties();
db.openMySQL();
logging.setup();
endpoints.listen();