//Importacion de librerias;
require("dotenv").config();

//inicializando express
const express = require("express");
const app = express();

//libreria para mostrar un log de las peticiones que llegan al servidor.
const morgan = require("morgan");

//libreria para configurar el cors
const cors = require("cors");

//libreria para manejar la autenticación
const jwt = require("jsonwebtoken");

//Libreria para manejar archivos
const fs = require("fs");

//libreria para validar parametros de entrada
const {body,param,query,validationResult} = require("express-validator");

//ocultar x-powered-by (cabecera)
app.disable("x-powered-by");

//se configura la libreria a utilizar para renderizar contenido desde el servidor.
app.set("view engine","ejs");

app.use(morgan("dev"));

//se configura el middleware para parsear las peticiones al servidor a json.
app.use(express.json());

//se configura el cors usando la libreria.
app.use(cors({allowedHeaders:"API-KEY"}));


//Configuracion del cors de manera manual
/*app.use((req,res,next)=>{

    res.header("Access-Control-Allow-Origin",["http://localhost:3000"]);
    res.header("Access-Control-Allow-Headers",["Content-Type","API-KEY"]);
    res.header("Access-Control-Allow-Methods",["POST","GET"]);
    //Acess-Control-Allow-Credentials -> Manejar las cookies
    next();

})*/

app.get("/",(req,res)=>{
     res.send("<h1>Hola desde el servidor</h1>");
})

app.get("/home",(req,res)=>{

    //renderizar una vista pasandole parametros
    res.render("home",{name:"Emmanuel"});

})


/*
    En este endpoin se utiliza el metodo body para validar parametros en el body (express-validator)
*/
app.post("/login",
    body("email").isEmail().withMessage("Is not a Email"),
    body("password").notEmpty().withMessage("the field password is required")
    ,(req,res)=>{

     //verificar que no haya habido errores en el body
     const result =  validationResult(req);
     if(!result.isEmpty())
         return res.status(400).json({errores:result.errors});


    const email    = req.body.email;
    const password = req.body.password;

    //validate in database  OTP | 2FA | email and password
    if(email != "bris@gmail.com" || password != "123")
        return res.status(400).json({message:"Invalid Credentials"});

    //generacion del token -> (payload,private_key) 
    const token = jwt.sign({email:"bris@gmail.com",id:2},process.env.PRIVATE_KEY);
    return res.status(200).json({token});

});

/**
 * Este endpoint esta protegido , solo los usuarios autenticados pueden acceder.
 * se utiliza el middleware auth para validar la autenticación
 */
app.post("/contacts",auth,(req,res)=>{

    //obtenemos el usuario autenticado.
    const user = req.user;

    //se lee un archivo json
    const data = fs.readFileSync("./contacts.json");
    const contacts = JSON.parse(data);

    //renderizar la vista contacts y se le pasa un json como parametro.
    res.render("contacts",{"contacts": contacts[`${user.id}`].contacts });

})


/**
 *  Middleware para checar la autenticacion de un usuario.
 */
function auth(req,res,next){
     
     //leer la cabecera APII-KEY de la petición
     const token = req.header("API-KEY");

     //verificar que el usuario haya mandado un token.
     if(!token){
         return res.status(400).json({message:"Authentication is required"});
     }

     try{

        //verificamos el token y extraemos el payload
        const payload = jwt.verify(token,process.env.PRIVATE_KEY);
        console.log("payload:",payload);

        //agregamos al objeto req una propiedad llamada user 
        //esta propiedad la vamos a utilizar en el método del endpoint.
        req.user = payload;

        next();

     }catch(err){
        return res.status(400).json({message:"Invalid Credentials"});
     }

}

//poner el servidor en escucha.
app.listen(process.env.PORT,()=>{
     console.log("server listening in port "+ process.env.PORT)
})