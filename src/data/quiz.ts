/**
 * Quiz question banks.
 *
 * Every answer here is a settled, checkable fact — no "most beautiful", no
 * figures that change with the next season, no trick phrasing where two options
 * could both be defended. A quiz that pays out for a wrong answer, or refuses
 * to pay for a right one, is worse than having no quiz at all.
 */

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  /** Index into `options`. */
  answer: number
  /** Shown after answering, so a wrong guess teaches something. */
  note: string
}

export interface QuizCategory {
  id: string
  name: string
  blurb: string
  /** Euros per correct answer. Harder categories pay more. */
  reward: number
  questions: QuizQuestion[]
}

export const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: 'general',
    name: 'Cars in general',
    blurb: 'Badges, brands and the basics.',
    reward: 120,
    questions: [
      {
        id: 'g-star', prompt: 'Which marque uses a three-pointed star as its badge?',
        options: ['BMW', 'Mercedes-Benz', 'Volvo', 'Mazda'], answer: 1,
        note: 'The three points stand for land, sea and air.',
      },
      {
        id: 'g-rings', prompt: 'Whose badge is four interlocking rings?',
        options: ['Audi', 'Alfa Romeo', 'Opel', 'Subaru'], answer: 0,
        note: 'The rings represent the four marques that merged into Auto Union in 1932.',
      },
      {
        id: 'g-horse', prompt: 'Which Italian marque uses a prancing horse?',
        options: ['Lamborghini', 'Maserati', 'Ferrari', 'Pagani'], answer: 2,
        note: 'Maserati uses a trident; Lamborghini a raging bull.',
      },
      {
        id: 'g-bull', prompt: 'Whose badge is a raging bull?',
        options: ['Lamborghini', 'Ferrari', 'Abarth', 'Dodge'], answer: 0,
        note: 'Ferruccio Lamborghini was a Taurus, and a fan of bullfighting.',
      },
      {
        id: 'g-bestseller', prompt: 'Which model is the best-selling car of all time?',
        options: ['Ford F-Series', 'Volkswagen Beetle', 'Toyota Corolla', 'Honda Civic'],
        answer: 2, note: 'Over 50 million Corollas have been built since 1966.',
      },
      {
        id: 'g-abs', prompt: 'What does ABS stand for?',
        options: ['Automatic Brake Support', 'Anti-lock Braking System', 'Assisted Brake Servo', 'Axle Balance System'],
        answer: 1, note: 'It stops the wheels locking so you can still steer while braking hard.',
      },
      {
        id: 'g-porsche911', prompt: 'Which company builds the 911?',
        options: ['Porsche', 'Audi', 'BMW', 'Lotus'], answer: 0,
        note: 'In production since 1964, and still rear-engined.',
      },
      {
        id: 'g-volvo', prompt: 'Which country is Volvo originally from?',
        options: ['Norway', 'Germany', 'Sweden', 'Denmark'], answer: 2,
        note: 'Founded in Gothenburg in 1927.',
      },
      {
        id: 'g-mustang', prompt: 'Who makes the Mustang?',
        options: ['Chevrolet', 'Ford', 'Dodge', 'Pontiac'], answer: 1,
        note: 'Launched in 1964 and the car that named the "pony car" class.',
      },
      {
        id: 'g-rr', prompt: 'Which group owns Rolls-Royce Motor Cars?',
        options: ['Volkswagen Group', 'BMW', 'Stellantis', 'Tata Motors'], answer: 1,
        note: 'BMW has owned the car business since 2003; Bentley went to Volkswagen.',
      },
      {
        id: 'g-jaguar', prompt: 'Which group owns Jaguar Land Rover?',
        options: ['Tata Motors', 'BMW', 'Ford', 'Geely'], answer: 0,
        note: 'Tata bought both marques from Ford in 2008.',
      },
      {
        id: 'g-suv', prompt: 'What does SUV stand for?',
        options: ['Super Utility Vehicle', 'Sport Utility Vehicle', 'Standard Universal Vehicle', 'Sport Urban Vehicle'],
        answer: 1, note: 'A body style, not a technical specification.',
      },
      {
        id: 'g-civic', prompt: 'Which marque builds the Civic?',
        options: ['Toyota', 'Nissan', 'Honda', 'Mazda'], answer: 2,
        note: 'On sale since 1972.',
      },
      {
        id: 'g-mini', prompt: 'Who designed the original 1959 Mini?',
        options: ['Alec Issigonis', 'Colin Chapman', 'Giorgetto Giugiaro', 'Enzo Ferrari'],
        answer: 0, note: 'His transverse engine and front-wheel drive layout set the template for small cars.',
      },
      {
        id: 'g-skoda', prompt: 'Škoda is part of which group?',
        options: ['Stellantis', 'Volkswagen Group', 'Renault-Nissan', 'Hyundai'], answer: 1,
        note: 'Volkswagen took a stake in 1991 and full ownership in 2000.',
      },
      {
        id: 'g-ev', prompt: 'In an electric car, what does the battery capacity kWh measure?',
        options: ['Power output', 'Stored energy', 'Charging speed', 'Motor torque'], answer: 1,
        note: 'Energy stored. Power, what the motor can deliver at once, is measured in kW.',
      },
      {
        id: 'g-lemans-brand', prompt: 'Which marque is famous for the Quattro four-wheel-drive system?',
        options: ['Audi', 'Subaru', 'Mitsubishi', 'Lancia'], answer: 0,
        note: 'Introduced on the Audi Quattro in 1980 and later applied across the range.',
      },
      {
        id: 'g-bentley', prompt: 'Which group owns Bentley?',
        options: ['BMW', 'Volkswagen Group', 'Tata Motors', 'Stellantis'], answer: 1,
        note: 'Bentley and Rolls-Royce were split in 1998; Bentley went to Volkswagen.',
      },
    ],
  },

  {
    id: 'alfa',
    name: 'Alfa Romeo',
    blurb: 'Milan, the cloverleaf and the serpent.',
    reward: 150,
    questions: [
      {
        id: 'a-city', prompt: 'In which city was Alfa Romeo founded?',
        options: ['Turin', 'Modena', 'Milan', 'Bologna'], answer: 2,
        note: 'The badge carries Milan’s red cross and the Visconti serpent.',
      },
      {
        id: 'a-alfa', prompt: 'The A.L.F.A. in the original name stood for Anonima Lombarda Fabbrica…',
        options: ['Automobili', 'Aeroplani', 'Assemblaggi', 'Alluminio'], answer: 0,
        note: 'Anonima Lombarda Fabbrica Automobili, founded in 1910.',
      },
      {
        id: 'a-serpent', prompt: 'What creature appears on the right half of the Alfa Romeo badge?',
        options: ['An eagle', 'A serpent', 'A lion', 'A horse'], answer: 1,
        note: 'The Biscione, a crowned serpent taken from the arms of the Visconti family of Milan.',
      },
      {
        id: 'a-quad', prompt: 'What does Quadrifoglio mean?',
        options: ['Four cylinders', 'Four-leaf clover', 'Fourth generation', 'Four doors'],
        answer: 1, note: 'A good-luck charm first painted on a works car for the 1923 Targa Florio.',
      },
      {
        id: 'a-sivocci', prompt: 'Which driver first carried the cloverleaf, in the 1923 Targa Florio?',
        options: ['Tazio Nuvolari', 'Ugo Sivocci', 'Antonio Ascari', 'Giuseppe Campari'],
        answer: 1, note: 'Sivocci won with it; he died later that year in a car that did not carry it.',
      },
      {
        id: 'a-f1', prompt: 'Alfa Romeo won the first two Formula 1 world championships, in 1950 and 1951. With which car?',
        options: ['Tipo 33', 'Giulietta Sprint', '158/159 Alfetta', '8C 2900'], answer: 2,
        note: 'Giuseppe Farina took the 1950 title, Juan Manuel Fangio the 1951.',
      },
      {
        id: 'a-giulia-engine', prompt: 'What engine does the modern Giulia Quadrifoglio use?',
        options: ['2.9 litre twin-turbo V6', '4.0 litre V8', '3.0 litre inline six', '1.8 litre turbo four'],
        answer: 0, note: 'A 90-degree V6 developed with Ferrari engineering input.',
      },
      {
        id: 'a-4c', prompt: 'What is the Alfa Romeo 4C’s chassis made from?',
        options: ['Steel spaceframe', 'Aluminium monocoque', 'Carbon fibre monocoque', 'Glassfibre over steel'],
        answer: 2, note: 'The carbon tub is why it weighs under 1,000 kg.',
      },
      {
        id: 'a-gta', prompt: 'In Alfa Romeo model names, GTA stands for Gran Turismo…',
        options: ['Alleggerita', 'Assetto', 'Aerodinamica', 'Automatica'], answer: 0,
        note: 'Alleggerita means lightened — the GTA used aluminium panels to shed weight.',
      },
      {
        id: 'a-stelvio', prompt: 'The Alfa Romeo Stelvio is named after…',
        options: ['A designer', 'An Alpine mountain pass', 'A racing circuit', 'A district of Milan'],
        answer: 1, note: 'The Stelvio Pass in the Italian Alps, famous for its hairpins.',
      },
      {
        id: 'a-montreal', prompt: 'Why is the Alfa Romeo Montreal so called?',
        options: [
          'It was built in Canada',
          'It debuted at Expo 67 in Montreal',
          'It won a race in Montreal',
          'It was named after its designer',
        ],
        answer: 1, note: 'Shown as a concept at Expo 67; the public name stuck.',
      },
      {
        id: 'a-33stradale', prompt: 'The Alfa Romeo 33 Stradale was a road-going version of what?',
        options: ['A rally car', 'The Tipo 33 sports prototype', 'The Giulia saloon', 'A Formula 1 car'],
        answer: 1, note: 'Around 18 were built in the late 1960s, with butterfly doors.',
      },
      {
        id: 'a-graduate', prompt: 'Which Alfa Romeo was driven by Dustin Hoffman in The Graduate?',
        options: ['Giulietta Sprint', 'Duetto Spider', '2000 GTV', 'Montreal'], answer: 1,
        note: 'The 1966 Duetto Spider, which the film made famous in America.',
      },
      {
        id: 'a-dtm', prompt: 'Which championship did the Alfa Romeo 155 win at its first attempt in 1993?',
        options: ['World Rally Championship', 'DTM', 'British Touring Car Championship', 'Le Mans'],
        answer: 1, note: 'Nicola Larini dominated the German touring car series with the 155 V6 TI.',
      },
      {
        id: 'a-group', prompt: 'Which group does Alfa Romeo belong to today?',
        options: ['Volkswagen Group', 'Stellantis', 'BMW Group', 'Geely'], answer: 1,
        note: 'Formed in 2021 by the merger of Fiat Chrysler and PSA.',
      },
      {
        id: 'a-giulietta', prompt: 'The name Giulietta is the Italian form of which name?',
        options: ['Juliet', 'Julia', 'Giulia senior', 'Gina'], answer: 0,
        note: 'Juliet — and the larger saloon that followed it was the Giulia.',
      },
      {
        id: 'a-jano', prompt: 'Which engineer designed the Alfa Romeo 8C of the 1930s?',
        options: ['Vittorio Jano', 'Enzo Ferrari', 'Nicola Romeo', 'Orazio Satta'], answer: 0,
        note: 'Jano’s 8C won Le Mans four years running from 1931 to 1934.',
      },
      {
        id: 'a-enzo', prompt: 'Before founding his own marque, Enzo Ferrari ran the racing team of which company?',
        options: ['Maserati', 'Alfa Romeo', 'Lancia', 'Fiat'], answer: 1,
        note: 'Scuderia Ferrari began in 1929 as Alfa Romeo’s racing arm.',
      },
    ],
  },

  {
    id: 'racing',
    name: 'Racing',
    blurb: 'Formula 1, IndyCar, Le Mans and rally.',
    reward: 150,
    questions: [
      {
        id: 'r-indy', prompt: 'Which race is nicknamed "The Greatest Spectacle in Racing"?',
        options: ['Le Mans 24 Hours', 'Monaco Grand Prix', 'Indianapolis 500', 'Daytona 500'],
        answer: 2, note: 'Run over 200 laps of the 2.5-mile Indianapolis oval.',
      },
      {
        id: 'r-milk', prompt: 'What does the winner of the Indianapolis 500 traditionally drink?',
        options: ['Champagne', 'Milk', 'Orange juice', 'Water'], answer: 1,
        note: 'A tradition since Louis Meyer drank buttermilk after winning in 1936.',
      },
      {
        id: 'r-lemans', prompt: 'In which country is the Le Mans 24 Hours held?',
        options: ['Belgium', 'France', 'Italy', 'Germany'], answer: 1,
        note: 'On the Circuit de la Sarthe, partly made up of public roads.',
      },
      {
        id: 'r-triple', prompt: 'The Triple Crown of Motorsport is the Indy 500, the Le Mans 24 Hours and…',
        options: ['The Daytona 500', 'The Monaco Grand Prix', 'The Bathurst 1000', 'The British Grand Prix'],
        answer: 1, note: 'Graham Hill is the only driver to have won all three.',
      },
      {
        id: 'r-drs', prompt: 'In Formula 1, what does DRS stand for?',
        options: ['Drag Reduction System', 'Direct Response Steering', 'Downforce Regulation System', 'Dynamic Rear Suspension'],
        answer: 0, note: 'Opening a flap in the rear wing cuts drag to help a following car overtake.',
      },
      {
        id: 'r-constructors', prompt: 'Which team has won the most Formula 1 constructors’ championships?',
        options: ['McLaren', 'Williams', 'Ferrari', 'Mercedes'], answer: 2,
        note: 'Ferrari is also the only team to have contested every season since 1950.',
      },
      {
        id: 'r-titles', prompt: 'How many drivers’ world championships do Michael Schumacher and Lewis Hamilton each hold?',
        options: ['Five', 'Six', 'Seven', 'Eight'], answer: 2,
        note: 'Seven apiece — the joint record.',
      },
      {
        id: 'r-monza', prompt: 'Which circuit hosts the Italian Grand Prix?',
        options: ['Imola', 'Mugello', 'Monza', 'Vallelunga'], answer: 2,
        note: 'The Temple of Speed, in a royal park north of Milan.',
      },
      {
        id: 'r-blueflag', prompt: 'In Formula 1, what does a blue flag tell a driver?',
        options: [
          'The race is about to start',
          'Let a faster car through',
          'There is oil on the track',
          'Return to the pits',
        ],
        answer: 1, note: 'Shown to a driver about to be lapped.',
      },
      {
        id: 'r-senna', prompt: 'With which team did Ayrton Senna win all three of his world titles?',
        options: ['Lotus', 'Williams', 'McLaren', 'Toleman'], answer: 2,
        note: '1988, 1990 and 1991, with Honda power.',
      },
      {
        id: 'r-nurburgring', prompt: 'In which country is the Nürburgring Nordschleife?',
        options: ['Austria', 'Germany', 'Switzerland', 'Belgium'], answer: 1,
        note: 'Over 20 km and more than 150 corners, in the Eifel mountains.',
      },
      {
        id: 'r-nascar', prompt: 'What does NASCAR stand for?',
        options: [
          'North American Stock Car Association Racing',
          'National Association for Stock Car Auto Racing',
          'National American Series of Car Racing',
          'North American Speedway Car Racing',
        ],
        answer: 1, note: 'Founded in 1948 at Daytona Beach, Florida.',
      },
      {
        id: 'r-wrc', prompt: 'What does WRC stand for?',
        options: ['World Racing Cup', 'World Rally Championship', 'Winning Racers Circuit', 'World Roadster Class'],
        answer: 1, note: 'Contested on gravel, tarmac, snow and ice.',
      },
      {
        id: 'r-suzuka', prompt: 'In which country is the Suzuka circuit?',
        options: ['South Korea', 'China', 'Japan', 'Malaysia'], answer: 2,
        note: 'One of very few figure-of-eight layouts in top-level racing.',
      },
      {
        id: 'r-monaco', prompt: 'What kind of circuit is the Monaco Grand Prix run on?',
        options: ['A permanent road course', 'A street circuit', 'An oval', 'A rally stage'],
        answer: 1, note: 'Closed public roads through Monte Carlo, used since 1929.',
      },
      {
        id: 'r-points', prompt: 'How many points does a win score in the current Formula 1 system?',
        options: ['10', '18', '25', '50'], answer: 2,
        note: '25 for a win, 18 for second, 15 for third.',
      },
      {
        id: 'r-indy-oval', prompt: 'How long is the Indianapolis Motor Speedway oval?',
        options: ['1.5 miles', '2.5 miles', '3.5 miles', '4 miles'], answer: 1,
        note: 'Four laps to the mile — 200 laps makes the 500 miles.',
      },
      {
        id: 'r-chequered', prompt: 'What does the chequered flag signal?',
        options: ['A safety car period', 'The end of the race', 'A false start', 'Rain on track'],
        answer: 1, note: 'Shown first to the winner, then to every car that follows.',
      },
    ],
  },

  {
    id: 'mechanic',
    name: 'Mechanics',
    blurb: 'What the parts actually do.',
    reward: 180,
    questions: [
      {
        id: 'm-turbo', prompt: 'What spins the turbine in a turbocharger?',
        options: ['A belt from the crankshaft', 'Exhaust gases', 'An electric motor', 'Engine coolant'],
        answer: 1, note: 'Which is why a turbo can lag: the exhaust flow has to build first.',
      },
      {
        id: 'm-super', prompt: 'How is a supercharger driven?',
        options: ['By exhaust gases', 'Mechanically by the engine', 'By the alternator', 'By the gearbox'],
        answer: 1, note: 'Usually belt-driven off the crankshaft, so boost arrives immediately.',
      },
      {
        id: 'm-diesel', prompt: 'How does a diesel engine ignite its fuel?',
        options: ['A spark plug', 'Compression heat', 'A glow plug during running', 'An electric arc'],
        answer: 1, note: 'Air is compressed until it is hot enough to ignite the injected fuel.',
      },
      {
        id: 'm-clutch', prompt: 'What does the clutch do in a manual car?',
        options: [
          'Connects and disconnects engine from gearbox',
          'Slows the wheels',
          'Changes the final drive ratio',
          'Cools the gearbox',
        ],
        answer: 0, note: 'Which is what lets you change gear or stop without stalling.',
      },
      {
        id: 'm-diff', prompt: 'What is a differential for?',
        options: [
          'Letting driven wheels turn at different speeds',
          'Increasing engine power',
          'Filtering the oil',
          'Balancing the crankshaft',
        ],
        answer: 0, note: 'Cornering makes the outer wheel travel further than the inner one.',
      },
      {
        id: 'm-alternator', prompt: 'What does the alternator do?',
        options: [
          'Starts the engine',
          'Generates electricity and charges the battery',
          'Controls the fuel mixture',
          'Pumps the coolant',
        ],
        answer: 1, note: 'The battery starts the car; the alternator keeps it charged after that.',
      },
      {
        id: 'm-cat', prompt: 'What does a catalytic converter do?',
        options: [
          'Increases power',
          'Reduces harmful exhaust emissions',
          'Cools the exhaust',
          'Filters the fuel',
        ],
        answer: 1, note: 'It converts carbon monoxide, unburnt fuel and nitrogen oxides into less harmful gases.',
      },
      {
        id: 'm-torque', prompt: 'What does torque measure?',
        options: ['Rotational force', 'Rate of doing work', 'Engine speed', 'Fuel flow'],
        answer: 0, note: 'Power is torque multiplied by engine speed.',
      },
      {
        id: 'm-fourstroke', prompt: 'What is the correct order of a four-stroke cycle?',
        options: [
          'Compression, intake, power, exhaust',
          'Intake, compression, power, exhaust',
          'Intake, power, compression, exhaust',
          'Power, intake, compression, exhaust',
        ],
        answer: 1, note: 'Often remembered as suck, squeeze, bang, blow.',
      },
      {
        id: 'm-dohc', prompt: 'What does DOHC stand for?',
        options: ['Dual Output Horsepower Control', 'Double Overhead Camshaft', 'Direct Overhead Combustion', 'Dual Oil Heat Cooler'],
        answer: 1, note: 'Two camshafts in the cylinder head, one for inlet valves and one for exhaust.',
      },
      {
        id: 'm-timing', prompt: 'What does the timing belt or chain synchronise?',
        options: [
          'Crankshaft and camshaft',
          'Gearbox and differential',
          'Alternator and battery',
          'Water pump and radiator',
        ],
        answer: 0, note: 'So the valves open and close in step with the pistons.',
      },
      {
        id: 'm-coolant', prompt: 'Besides preventing overheating, what else does coolant do?',
        options: [
          'Lubricates the pistons',
          'Stops the system freezing',
          'Cleans the injectors',
          'Raises compression',
        ],
        answer: 1, note: 'Antifreeze lowers the freezing point and raises the boiling point.',
      },
      {
        id: 'm-ecu', prompt: 'What does ECU stand for?',
        options: ['Engine Control Unit', 'Exhaust Cleaning Unit', 'Electric Charging Unit', 'Emission Check Unit'],
        answer: 0, note: 'The computer managing fuelling, ignition timing and much else.',
      },
      {
        id: 'm-macpherson', prompt: 'A MacPherson strut is a type of what?',
        options: ['Brake', 'Suspension', 'Gearbox', 'Fuel injector'], answer: 1,
        note: 'A strut combining spring and damper, very common at the front of road cars.',
      },
      {
        id: 'm-brakefluid', prompt: 'Why is brake fluid a problem when it absorbs water?',
        options: [
          'It freezes more easily',
          'It boils more easily, causing brake fade',
          'It thickens and slows the pedal',
          'It stops conducting electricity',
        ],
        answer: 1, note: 'Boiling puts compressible vapour in the lines, and the pedal goes soft.',
      },
      {
        id: 'm-flywheel', prompt: 'What is the main job of a flywheel?',
        options: [
          'Smoothing out the engine’s rotation',
          'Driving the water pump',
          'Cooling the clutch',
          'Filtering exhaust gas',
        ],
        answer: 0, note: 'Its inertia carries the crankshaft between power strokes.',
      },
      {
        id: 'm-oil', prompt: 'Apart from lubricating, what else does engine oil do?',
        options: ['Carries heat away', 'Increases compression', 'Cools the brakes', 'Powers the steering'],
        answer: 0, note: 'It also cleans and carries debris to the filter.',
      },
      {
        id: 'm-viscosity', prompt: 'In an oil grade such as 5W-30, what does the W stand for?',
        options: ['Weight', 'Winter', 'Water', 'Wear'], answer: 1,
        note: 'The number before it describes how the oil flows when cold.',
      },
    ],
  },
]

export const QUIZ_CATEGORY_BY_ID = new Map(QUIZ_CATEGORIES.map((c) => [c.id, c]))
