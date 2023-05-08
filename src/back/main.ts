import * as endpoints from "./endpoints.js";
import * as properties from "./properties.js";
import * as logging from "./logging.js";

properties.initProperties();
logging.setup();
endpoints.listen();