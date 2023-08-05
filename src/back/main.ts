import * as endpoints from "./endpoints.js";
import * as properties from "./properties.js";
import * as logging from "./logging.js";
import * as db from "./db-queries.js";
import * as generateInhabitants from "../showcase/generate-inhabitants.js";
import * as generateLDAP from "../showcase/generate-users.js";


properties.initProperties();
logging.setup();
db.openMySQL().then(() =>
generateInhabitants.generateShowcaseInhabitants().then(() =>
generateLDAP.generateAccountData().then(() => 
endpoints.listen()
)));