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

//libreria para manejar cookies
const cookies = require("cookie-session");

//Libreria para manejar archivos
const fs = require("fs");

//libreria para validar parametros de entrada
const {body,param,query,validationResult, cookie} = require("express-validator");

//ocultar x-powered-by (cabecera)
app.disable("x-powered-by");

//se configura la libreria a utilizar para renderizar contenido desde el servidor.
app.set("view engine","ejs");

app.use(morgan("dev"));

//se configura el middleware para parsear las peticiones al servidor a json.
app.use(express.json());

//se configura el cors usando la libreria.
app.use(cors({allowedHeaders:"API-KEY"}));

app.use(cookies({
    name:"session",
    httpOnly:true,
    secret:process.env.COOKIES_SECRET,
    maxAge: 10 * 60 * 60 * 1000, 
}))

//Configuracion del cors de manera manual
/*app.use((req,res,next)=>{

    res.header("Access-Control-Allow-Origin",["http://localhost:3000"]);
    res.header("Access-Control-Allow-Headers",["Content-Type","API-KEY"]);
    res.header("Access-Control-Allow-Methods",["POST","GET"]);
    //Acess-Control-Allow-Credentials -> Manejar las cookies
    next();

})*/

app.get("/",(req,res)=>{
     res.send("<h1>Taller 2 Backend for beginners</h1>");
})

app.get("/home",(req,res)=>{

    //renderizar una vista pasandole parametros
    res.render("home",{name:"Emmanuel"});

})


app.get("/login",(req,res)=>{
     return res.render("login");
});


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
    
    //add cookies to request
    req.session.data = JSON.stringify({token});
    
    return res.status(200).json({message:"successfull login"});

});

/**
 * Este endpoint esta protegido , solo los usuarios autenticados pueden acceder.
 * se utiliza el middleware auth para validar la autenticación
 */
app.get("/contacts",auth,(req,res)=>{

    //obtenemos el usuario autenticado.
    const user = req.user;

    //se lee un archivo json
    const data = fs.readFileSync("./contacts.json");
    const contacts = JSON.parse(data);

    //renderizar la vista contacts y se le pasa un json como parametro.
    res.render("contacts",{"contacts": contacts[`${user.id}`].contacts });

})


app.post("/contacts",
auth,
body("name").notEmpty().withMessage("The field name is required"),
body("age").isNumeric().withMessage("The field age must be a number"),
(req,res)=>{

    const result = validationResult(req);
    if(!result.isEmpty())
        return res.status(400).json({errors:result.errors});

    const {name,age} = req.body;
    const data = fs.readFileSync("./contacts.json");
    const contacts = JSON.parse(data);
     
    //obtener el usuario autenticado
    const user = req.user;

    contacts[`${user.id}`].contacts.push({
        name,
        age
    });

    fs.writeFileSync("./contacts.json",JSON.stringify(contacts));

    return res.status(200).json({message:"Contact Created"})

})



/**
 *  Middleware para checar la autenticacion de un usuario.
 */
function auth(req,res,next){
     

     //leer token desde la cookie
     const data = req.session.data;

     //leer la cabecera APII-KEY de la petición
     //const token = req.header("API-KEY");

     if(!data){
        return res.status(400).json({message:"Authentication is required"});
     }

     //verificar que el usuario haya mandado un token.
     /*if(!token){
         return res.status(400).json({message:"Authentication is required"});
     }*/

     try{

        const {token} = JSON.parse(data);

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