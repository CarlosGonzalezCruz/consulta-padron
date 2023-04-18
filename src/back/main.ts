import * as endpoints from './endpoints.js';
import * as properties from "./properties.js";

properties.initProperties();
endpoints.listen(properties.get("Application.https-port"), properties.get("Application.http-port", null));