import { DestinationChallengeResult, MissionStats, ScienceReportData } from '../types/mission';
import { Language } from '../i18n/I18nContext';

function buildRawMissionScienceReport(
  missionId: string,
  payloadId: string,
  stats: MissionStats,
  lang: Language
): ScienceReportData {
  if (lang === 'en') {
    if (missionId === 'mars-explorer-2026') {
      if (payloadId === 'payload-rover-autonomo') {
        return {
          missionId,
          missionName: 'Mars 2026 Mission: Martian Explorer',
          destination: 'Mars (Isidis Planitia)',
          payloadUsed: 'Autonomous Geological Rover (6-Wheel Rocker-Bogie, Core Drill & Raman Spectrometer)',
          primaryDiscovery: 'Unambiguous detection of phyllosilicates and hydrated crystalline olivine 8 cm below surface.',
          summary:
            'The 6-wheel rover safely descended the lander deployment ramp onto Isidis Planitia. Using rotary micro-percussion on basaltic bedrock, the Raman spectrometer logged clear mineralogical signatures of pre-Noachian hydrothermal aqueous alteration.',
          commsLatencySec: 852,
          commsLatencyFormatted: '14 min 12 s (One-Way)',
          environmentConditions: {
            temperature: '-58.4 °C (214.75 K)',
            pressure: '612 Pa (0.006 atm)',
            radiation: '0.64 mGy / day (MSL RAD Benchmark)',
            solarFlux: '412 W/m² (Attenuated by airborne dust haze)',
          },
          instrumentReadings: [
            {
              id: 'raman-shift',
              name: 'Micro-Laser Raman Shift (532 nm)',
              category: 'Mineralogy',
              value: '824 / 856',
              unit: 'cm⁻¹',
              status: 'optimal',
              nasaReference: 'SuperCam / Perseverance PDS Record MSL-2021',
              description: 'Characteristic crystalline doublet of preserved hydrated forsterite (Mg₂SiO₄).',
            },
            {
              id: 'drill-depth',
              name: 'Rotary Core Drilling Depth',
              category: 'Mechanical Sampling',
              value: '8.4',
              unit: 'cm',
              status: 'nominal',
              nasaReference: 'Adaptive Caching System (Mars 2020)',
              description: '13 mm cylindrical core hermetically sealed inside a titanium sample return tube.',
            },
            {
              id: 'dust-tau',
              name: 'Atmospheric Optical Depth (Tau τ)',
              category: 'Meteorology',
              value: '0.68',
              unit: 'τ',
              status: 'warning',
              nasaReference: 'MEDA (Mars Environmental Dynamics Analyzer)',
              description: 'Suspended aeolian dust haze reducing solar array output by 28.5%.',
            },
            {
              id: 'wheel-slip',
              name: 'Rocker-Bogie Mobility Traction',
              category: 'Surface Mobility',
              value: '4.2',
              unit: '% slip',
              status: 'nominal',
              nasaReference: 'Curiosity Wheel Wear & Mobility Team',
              description: 'Nominal traction across consolidated basaltic sand with zero sinkage in transverse dunes.',
            },
          ],
          spectralData: {
            title: 'Raman Scattering Spectrum (Isidis Planitia Core Sample)',
            xAxisLabel: 'Raman Shift (cm⁻¹)',
            yAxisLabel: 'Normalized Photon Counts',
            points: [
              { wavelength: 200, intensity: 180, label: 'Base lattice' },
              { wavelength: 400, intensity: 310, label: 'Si-O bending' },
              { wavelength: 600, intensity: 220 },
              { wavelength: 824, intensity: 940, label: 'Forsterite Olivine', compound: 'Mg₂SiO₄' },
              { wavelength: 856, intensity: 890, label: 'Fe-Fayalite', compound: 'Fe₂SiO₄' },
              { wavelength: 1080, intensity: 710, label: 'Magnesium Carbonate', compound: 'MgCO₃' },
              { wavelength: 1400, intensity: 290 },
              { wavelength: 1600, intensity: 190 },
            ],
            keyFindings: [
              'Confirmed clay minerals formed through persistent interaction with neutral-to-alkaline liquid water.',
              'Low subsurface oxidation favors preservation of potential ancient organic biosignatures.',
            ],
          },
          nasaResearchSource: {
            repository: 'NASA OSDR',
            recordId: 'OSDR-00412 / NASA PDS-GEO',
            title: 'Perchlorate-Resistant Halophiles & Organic Biosignature Preservation in Martian Regolith',
            url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSDR-412',
            realWorldFact:
              'Perchlorate salts (ClO₄⁻) in Martian regolith act as an antifreeze down to -70 °C, but oxidize organic molecules during thermal pyrolysis.',
          },
          physicalConstraints: [
            {
              title: 'Speed-of-Light Telemetry Latency (OWLT)',
              impact: 'Every command transmitted from Mission Control takes 14.2 minutes to reach Mars.',
              engineeringMitigation:
                'The rover runs onboard stereo hazard avoidance and autonomous grid pathfinding without real-time joystick control.',
            },
            {
              title: 'Solar Attenuation from Regional Dust Storms',
              impact: 'Suspended iron-oxide aerosols scatter incoming sunlight and reduce array yield.',
              engineeringMitigation:
                'Dynamic solar-azimuth tracking combined with automated secondary heater load shedding overnight.',
            },
          ],
        };
      } else if (payloadId === 'payload-radar-atmosferico') {
        return {
          missionId,
          missionName: 'Mars 2026 Mission: Martian Explorer',
          destination: 'Mars (Isidis Planitia)',
          payloadUsed: 'Quadrupole Mass Spectrometer & Subsurface Radar (SHARAD/RIMFAX)',
          primaryDiscovery: 'Subsurface water-ice lens detected (dielectric constant ε = 3.1) at 14 meters depth.',
          summary:
            'The ground-penetrating radar transmitted polarized 15–25 MHz pulses through Isidis regolith, resolving a sharp reflective horizon consistent with relic water ice preserved beneath windblown dust.',
          commsLatencySec: 852,
          commsLatencyFormatted: '14 min 12 s (One-Way)',
          environmentConditions: {
            temperature: '-58.4 °C (214.75 K)',
            pressure: '612 Pa (0.006 atm)',
            radiation: '0.64 mGy / day',
            solarFlux: '412 W/m²',
          },
          instrumentReadings: [
            {
              id: 'dielectric-const',
              name: 'Relative Dielectric Permittivity (ε)',
              category: 'Radar Geophysics',
              value: '3.12',
              unit: 'εᵣ',
              status: 'optimal',
              nasaReference: 'SHARAD MRO PDS Sounder Volume 34',
              description: 'Matches an 85% water-ice and 15% basaltic-dust subsurface matrix.',
            },
            {
              id: 'radar-depth',
              name: 'Subsurface Sounding Penetration',
              category: 'Deep Sounding',
              value: '22.6',
              unit: 'm',
              status: 'nominal',
              nasaReference: 'RIMFAX Perseverance Subsurface Radar',
              description: 'Crisp basal echo return with minimal scattering attenuation.',
            },
            {
              id: 'atmos-co2',
              name: 'Atmospheric CO₂ Concentration',
              category: 'Mass Spectrometry',
              value: '95.32',
              unit: '% vol',
              status: 'nominal',
              nasaReference: 'SAM (Sample Analysis at Mars) QMS Suite',
              description: 'Nominal Martian composition alongside 2.6% N₂ and 1.9% Ar-40.',
            },
          ],
          spectralData: {
            title: 'Subsurface Dielectric Reflection Radargram Profile',
            xAxisLabel: 'Calculated Depth (Meters Below Surface)',
            yAxisLabel: 'Return Power Amplitude (dB)',
            points: [
              { wavelength: '0m', intensity: 950, label: 'Surface Echo' },
              { wavelength: '3m', intensity: 410, label: 'Loose aeolian silt' },
              { wavelength: '7m', intensity: 280, label: 'Porous basaltic flow' },
              { wavelength: '14m', intensity: 880, label: 'Relic Ice Lens Interface', compound: 'H₂O Ice (ε=3.1)' },
              { wavelength: '18m', intensity: 520, label: 'Cryogenic stratum base' },
              { wavelength: '25m', intensity: 160, label: 'Noachian bedrock' },
            ],
            keyFindings: [
              'Estimated ice reserve is sufficient to supply future crewed ISRU propellant production.',
              'The 14-meter overburden shields the ice sheet against thermal sublimation and cosmic rays.',
            ],
          },
          nasaResearchSource: {
            repository: 'NASA PDS',
            recordId: 'PDS-GEO: MRO-M-SHARAD-5-RADARGRAM-V1.0',
            title: 'Subsurface Radar Sounding of Isidis and Utopia Planitia Ice Deposits',
            url: 'https://pds-geosciences.wustl.edu/missions/mro/sharad.htm',
            realWorldFact:
              'NASA’s SHARAD radar measures wave propagation delays caused by the dielectric permittivity of buried ice versus dry basalt.',
          },
          physicalConstraints: [
            {
              title: 'RF Dispersion in Saline Regolith',
              impact: 'Hydrated sulfate minerals absorb radar energy, capping clean penetration near 50 meters.',
              engineeringMitigation:
                'Continuous frequency-modulated (FMCW) chirps across 15–25 MHz maximize signal-to-noise penetration.',
            },
            {
              title: 'Water Triple-Point Pressure Limit (611 Pa)',
              impact: 'At 612 Pa surface pressure, exposed liquid water boils or sublimates almost instantaneously.',
              engineeringMitigation:
                'All ice extraction must occur inside sealed, actively pressurized processing vessels.',
            },
          ],
        };
      } else {
        return {
          missionId,
          missionName: 'Mars 2026 Mission: Martian Explorer',
          destination: 'Mars (Isidis Planitia)',
          payloadUsed: 'Mini-Infrared Space Telescope & Aerosol Radiometer',
          primaryDiscovery: 'Column water-vapor mapping and condensation tracking over volcanic plateaus.',
          summary:
            'Multispectral observations from 1.2 to 2.5 µm measured integrated water vapor columns (8–14 precipitable microns) and solar-UV photodissociation rates.',
          commsLatencySec: 852,
          commsLatencyFormatted: '14 min 12 s (One-Way)',
          environmentConditions: {
            temperature: '-58.4 °C (214.75 K)',
            pressure: '612 Pa (0.006 atm)',
            radiation: '0.64 mGy / day',
            solarFlux: '412 W/m²',
          },
          instrumentReadings: [
            {
              id: 'h2o-column',
              name: 'Column Precipitable Water Vapor',
              category: 'Planetary Astrometry',
              value: '11.8',
              unit: 'pr. µm',
              status: 'nominal',
              nasaReference: 'CRISM / MRO Science Archives',
              description: 'Diurnal peaks driven by thermal sublimation from polar ice caps.',
            },
            {
              id: 'aerosol-size',
              name: 'Effective Dust Aerosol Radius',
              category: 'Atmospheric Optics',
              value: '1.45',
              unit: 'µm',
              status: 'nominal',
              nasaReference: 'Mastcam-Z Calibration Dataset 2024',
              description: 'Fine micron-scale grains driving forward scattering and blue Martian sunsets.',
            },
          ],
          spectralData: {
            title: 'Isidis Planitia Infrared Atmospheric Transmittance',
            xAxisLabel: 'Wavelength (µm)',
            yAxisLabel: 'Relative Transmittance (%)',
            points: [
              { wavelength: '1.0µm', intensity: 88, label: 'Optical window' },
              { wavelength: '1.4µm', intensity: 22, label: 'H₂O Absorption Band', compound: 'H₂O Vapor' },
              { wavelength: '1.9µm', intensity: 48, label: 'Hydrated minerals' },
              { wavelength: '2.0µm', intensity: 12, label: 'Strong CO₂ Band', compound: 'Atmospheric CO₂' },
              { wavelength: '2.4µm', intensity: 82, label: 'Sounding window' },
            ],
            keyFindings: [
              'Without a thick ozone shield, solar UV splits upper-atmosphere water molecules into escaping H⁺ ions.',
              'Thin dust layers selectively scatter short-wave infrared wavelengths.',
            ],
          },
          nasaResearchSource: {
            repository: 'NASA PDS',
            recordId: 'PDS-ATM: MEX-M-SPICAM-3-EXT1-V1.0',
            title: 'Ultraviolet and Infrared Atmospheric Sensor Observations of Martian Clouds and Ozone',
            url: 'https://pds-atmospheres.nmsu.edu/',
            realWorldFact:
              'Unlike Earth, Mars lacks a protective stratospheric ozone layer, allowing solar UV photons to break water molecules directly.',
          },
          physicalConstraints: [
            {
              title: 'Electrostatic Dust Adhesion on Optics',
              impact: 'Triboelectrically charged iron-oxide dust clings stubbornly to primary lenses.',
              engineeringMitigation:
                'Hydrophobic anti-static coatings paired with piezoelectric traveling-wave dust shields.',
            },
            {
              title: 'Diurnal Thermal Contraction (ΔT > 80 °C)',
              impact: 'Daily temperature swings shift optical alignment unless thermally compensated.',
              engineeringMitigation:
                'Zero-CTE carbon-fiber metering truss maintaining sub-micron focal stability.',
            },
          ],
        };
      }
    }

    if (missionId === 'artemis-lunar') {
      return {
        missionId,
        missionName: 'Artemis IV Mission: Lunar Orbit',
        destination: 'The Moon (NRHO Orbit - South Pole-Aitken)',
        payloadUsed:
          payloadId === 'payload-rover-autonomo'
            ? 'Polar Regolith Explorer & Volatile Spectrometer'
            : payloadId === 'payload-radar-atmosferico'
              ? 'Circular-Polarization Mini-RF Radar & Exospheric Spectrometer'
              : 'Deep-Space Cryogenic Polar Telescope',
        primaryDiscovery: 'Water-ice signature verified inside Permanently Shadowed Regions (CPR > 1.25).',
        summary:
          'From Near-Rectilinear Halo Orbit (NRHO), Orion and the European Service Module aimed bistatic radar sensors at Shackleton and Faustini craters, confirming stratified volatile-rich regolith deposits.',
        commsLatencySec: 1.28,
        commsLatencyFormatted: '1.28 seconds (One-Way)',
        environmentConditions: {
          temperature: '40 K (-233.15 °C) in PSR / +120 °C sunlit',
          pressure: '10⁻¹⁰ Pa (Lunar ultra-high vacuum)',
          radiation: '1.36 mSv / day (Unshielded cosmic-ray flux)',
          solarFlux: '1361 W/m² (Lunar orbital solar constant)',
        },
        instrumentReadings: [
          {
            id: 'cpr-polarization',
            name: 'Circular Polarization Ratio (CPR)',
            category: 'Synthetic Aperture Radar',
            value: '1.38',
            unit: 'Ratio',
            status: 'optimal',
            nasaReference: 'Mini-RF / Lunar Reconnaissance Orbiter (LRO)',
            description: 'CPR values > 1.0 confirm coherent volume backscatter from clean water-ice deposits.',
          },
          {
            id: 'cryo-boiloff',
            name: 'Cryogenic Propellant Boil-Off Rate',
            category: 'ESM Propulsion',
            value: '0.076',
            unit: '% / day',
            status: 'nominal',
            nasaReference: 'Cryogenic Fluid Management (CFM) Technology',
            description: 'Multi-layer insulation (MLI) stabilizes LOX and methane over the 6.5-day NRHO period.',
          },
          {
            id: 'laser-downlink',
            name: 'Earth-Moon Optical Laser Link (O2O)',
            category: 'Optical Comms',
            value: '260',
            unit: 'Mbps',
            status: 'optimal',
            nasaReference: 'Orion Artemis II/IV Optical Communications System',
            description: 'Real-time high-rate science telemetry streaming to White Sands, New Mexico.',
          },
          {
            id: 'h-abundance',
            name: 'Water-Equivalent Epithermal Neutrons',
            category: 'Nuclear Spectroscopy',
            value: '5.6',
            unit: '% H₂O mass',
            status: 'optimal',
            nasaReference: 'LEND (Lunar Exploration Neutron Detector)',
            description: 'Elemental hydrogen trapped inside South Pole-Aitken cryogenic cold traps.',
          },
        ],
        spectralData: {
          title: 'Polar Ice Thermal & Radar Brightness Profile (Faustini Crater)',
          xAxisLabel: 'Cold-Trap Regolith Depth (cm)',
          yAxisLabel: 'Normalized Reflectance / CPR',
          points: [
            { wavelength: '0cm', intensity: 210, label: 'Desiccated surface dust' },
            { wavelength: '15cm', intensity: 480, label: 'Lunar permafrost onset' },
            { wavelength: '30cm', intensity: 820, label: 'Ice-grain enriched horizon', compound: 'H₂O Ice (5.6% wt)' },
            { wavelength: '50cm', intensity: 940, label: 'Dense volatile deposit', compound: 'Frozen H₂O + CO₂' },
            { wavelength: '80cm', intensity: 780, label: 'Compacted anorthosite' },
          ],
          keyFindings: [
            'Lunar polar ice accumulated over 2 billion years of cometary and volatile-rich impacts.',
            'Reserves are sufficient for future in-situ LOX/LH₂ propellant production at Artemis Base Camp.',
          ],
        },
        nasaResearchSource: {
          repository: 'NASA OSDR',
          recordId: 'OSDR-00329 / NASA LRO Diviner',
          title: 'Lunar Deep Space Radiation Environment and Microdosimetry on Biological Systems',
          url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSDR-329',
          realWorldFact:
            'Permanently shadowed craters at the Lunar South Pole drop to 40 Kelvin (-233 °C)—colder than the surface of Pluto.',
        },
        physicalConstraints: [
          {
            title: 'Extreme Thermal Gradient (+120 °C to -233 °C)',
            impact: 'Sharp transitions between direct sunlight and crater shadow induce severe structural thermal shock.',
            engineeringMitigation:
              'Pumped-loop fluid heat pipes paired with silica aerogel thermal standoffs on instrument bays.',
          },
          {
            title: 'Electrostatic Lunar Regolith Abrasion',
            impact: 'Solar wind charges jagged glass-like lunar dust that abrades rotary seals and optical coatings.',
            engineeringMitigation:
              'Electrostatic dust-repulsion shields and polycrystalline diamond bearing surfaces.',
          },
        ],
      };
    }

    // Lagrange L2 (EN)
    return {
      missionId,
      missionName: 'Lagrange L2 Observatory Mission',
      destination: 'Sun-Earth L2 Lagrange Point (1,500,000 km)',
      payloadUsed:
        payloadId === 'payload-mini-telescopio'
          ? '18-Segment Gold-Coated Beryllium Mini-IR Telescope'
          : payloadId === 'payload-radar-atmosferico'
            ? 'Quadrupole Spectrometer & Interplanetary Solar-Wind Detector'
            : 'Robotic Thermal Sunshield Calibration Suite',
      primaryDiscovery: 'Clear detection of water vapor and carbon dioxide in exoplanet WASP-96b.',
      summary:
        'Stationed in an L2 halo orbit, the observatory tensioned its 5-layer aluminized Kapton sunshield. Isolated from Earth and solar infrared glare, the cryo-cooled detector resolved exoplanet atmospheric absorption features.',
      commsLatencySec: 5.0,
      commsLatencyFormatted: '5.0 seconds (One-Way)',
      environmentConditions: {
        temperature: 'Sun Side: +85.2 °C (358 K) | Cold Side: -235.9 °C (37.2 K)',
        pressure: '0 Pa (Deep-space vacuum)',
        radiation: '0.98 mSv / day (Unattenuated solar wind)',
        solarFlux: 'Sun Side: 1350 W/m² | Mirror Side: < 0.0001 W/m²',
      },
      instrumentReadings: [
        {
          id: 'cold-temp',
          name: 'Infrared Detector Operating Temp',
          category: 'Cryogenics',
          value: '37.2',
          unit: 'K (-235.95 °C)',
          status: 'optimal',
          nasaReference: 'JWST NIRCam / MIRI Cryocooler Telemetry',
          description: 'Passive radiative cooling keeps the focal plane well below intrinsic thermal noise thresholds.',
        },
        {
          id: 'sunshield-gradient',
          name: '5-Layer Sunshield Thermal Gradient',
          category: 'Thermal Control',
          value: '321',
          unit: 'K ΔT',
          status: 'optimal',
          nasaReference: 'JWST Sunshield Deployment Engineering Data',
          description: 'Silicon-doped Kapton membranes reject 99.9% of incident solar thermal load.',
        },
        {
          id: 'redshift-z',
          name: 'Photometric High-Redshift Source',
          category: 'Observational Cosmology',
          value: 'z = 13.2',
          unit: 'Redshift',
          status: 'optimal',
          nasaReference: 'JADES (JWST Advanced Deep Extragalactic Survey)',
          description: 'Light emitted over 13.4 billion years ago, just 320 million years after the Big Bang.',
        },
        {
          id: 'dsn-snr',
          name: 'Deep Space Network (DSN) Link Margin',
          category: 'Ka-Band Telemetry',
          value: '18.4',
          unit: 'dB SNR',
          status: 'nominal',
          nasaReference: 'NASA Deep Space Network 70m Antennas (Madrid/Goldstone)',
          description: '1.5M km path loss overcome via high-gain parabolic dish and 80W TWT amplifier.',
        },
      ],
      spectralData: {
        title: 'Exoplanet Atmospheric Transmission Spectrum (NIRSpec)',
        xAxisLabel: 'Infrared Wavelength (µm)',
        yAxisLabel: 'Transit Depth (ppm)',
        points: [
          { wavelength: '0.8µm', intensity: 1180, label: 'Rayleigh scattering' },
          { wavelength: '1.1µm', intensity: 1240 },
          { wavelength: '1.4µm', intensity: 1460, label: 'Water Vapor Band', compound: 'Molecular H₂O' },
          { wavelength: '1.8µm', intensity: 1210 },
          { wavelength: '2.7µm', intensity: 1390, label: 'Secondary H₂O feature' },
          { wavelength: '4.3µm', intensity: 1680, label: 'Sharp Carbon Dioxide Peak', compound: 'CO₂ Gas' },
          { wavelength: '5.0µm', intensity: 1290, label: 'Carbon Monoxide', compound: 'CO' },
        ],
        keyFindings: [
          'First unambiguous detection of carbon dioxide in the atmosphere of a planet orbiting a Sun-like star.',
          'Measured C/O ratio points to ice-pebble accretion beyond the protoplanetary snow line.',
        ],
      },
      nasaResearchSource: {
        repository: 'NASA MAST / STScI',
        recordId: 'MAST: JWST-PROGRAM-01366 / OSDR-00184',
        title: 'Transmission Spectroscopy of Giant Gas Exoplanets and Deep Space Genomic Radioprotection',
        url: 'https://archive.stsci.edu/missions-and-data/jwst',
        realWorldFact:
          'At L2, balanced Earth-Sun gravity keeps the observatory synchronized with Earth’s orbit so its sunshield continuously faces away from deep space targets.',
      },
      physicalConstraints: [
        {
          title: 'Asymmetric Solar Radiation Pressure Torque',
          impact: 'Solar photons exert continuous pressure across the 21×14 meter sunshield membrane.',
          engineeringMitigation:
            'Aft solar-momentum trim flap paired with reaction wheels and periodic thruster desaturation.',
        },
        {
          title: 'Inverse-Square Deep Space Signal Attenuation',
          impact: 'At 1.5 million km, downlink signal power drops to trillionths of a watt at Earth.',
          engineeringMitigation:
            '70-meter DSN cryogenic parabolic dishes using liquid-helium cooled maser receivers.',
        },
      ],
    };
  }

  // SPANISH (DEFAULT)
  if (missionId === 'mars-explorer-2026') {
    if (payloadId === 'payload-rover-autonomo') {
      return {
        missionId,
        missionName: 'Misión Mars 2026: Explorador Marciano',
        destination: 'Marte (Planicie de Isidis)',
        payloadUsed: 'Rover Autónomo de Exploración Geológica (6 Ruedas, Taladro y Espectrómetro Raman)',
        primaryDiscovery: 'Detección inequívoca de Filosilicatos y Olivino cristalino hidratado a 8 cm de profundidad.',
        summary:
          'El rover de 6 ruedas completó con éxito el descenso por la rampa del módulo de aterrizaje en la Planicie de Isidis. Mediante micro-percusión en el lecho rocoso basáltico, el espectrómetro Raman registró la signatura mineralógica característica de alteración acuosa hidrotermal pre-Noeica.',
        commsLatencySec: 852,
        commsLatencyFormatted: '14 min 12 s (Ida)',
        environmentConditions: {
          temperature: '-58.4 °C (214.75 K)',
          pressure: '612 Pa (0.006 atm)',
          radiation: '0.64 mGy / día (MSL RAD Benchmark)',
          solarFlux: '412 W/m² (Atenuado por calima de polvo)',
        },
        instrumentReadings: [
          {
            id: 'raman-shift',
            name: 'Dispersión Raman Micro-Láser (532 nm)',
            category: 'Mineralogía',
            value: '824 / 856',
            unit: 'cm⁻¹',
            status: 'optimal',
            nasaReference: 'SuperCam / Perseverance PDS Record MSL-2021',
            description: 'Doblete cristalino característico de Forsterite hidratada (Mg₂SiO₄) preservada.',
          },
          {
            id: 'drill-depth',
            name: 'Profundidad de Perforación del Testigo',
            category: 'Muestreo Mecánico',
            value: '8.4',
            unit: 'cm',
            status: 'nominal',
            nasaReference: 'Adaptive Caching System (Mars 2020)',
            description: 'Muestra cilíndrica de 13 mm sellada herméticamente en tubo de titanio para retorno.',
          },
          {
            id: 'dust-tau',
            name: 'Profundidad Óptica Atmosférica (Tau τ)',
            category: 'Meteorología',
            value: '0.68',
            unit: 'τ',
            status: 'warning',
            nasaReference: 'MEDA (Mars Environmental Dynamics Analyzer)',
            description: 'Calima eólica en suspensión. Reduce eficiencia de paneles solares en un 28.5%.',
          },
          {
            id: 'wheel-slip',
            name: 'Resistencia al Avance Rocker-Bogie',
            category: 'Tracción Terrestre',
            value: '4.2',
            unit: '% resbalamiento',
            status: 'nominal',
            nasaReference: 'Curiosity Wheel Wear & Mobility Team',
            description: 'Excelente tracción en arena basáltica consolidada sin atascos en dunas transversales.',
          },
        ],
        spectralData: {
          title: 'Espectro de Dispersión Raman (Testigo de Isidis Planitia)',
          xAxisLabel: 'Desplazamiento Raman (cm⁻¹)',
          yAxisLabel: 'Cuentas de Fotones Normalizadas',
          points: [
            { wavelength: 200, intensity: 180, label: 'Látice base' },
            { wavelength: 400, intensity: 310, label: 'Si-O bending' },
            { wavelength: 600, intensity: 220 },
            { wavelength: 824, intensity: 940, label: 'Olivino Forsterita', compound: 'Mg₂SiO₄' },
            { wavelength: 856, intensity: 890, label: 'Fayalita-Fe', compound: 'Fe₂SiO₄' },
            { wavelength: 1080, intensity: 710, label: 'Carbonato magnesiano', compound: 'MgCO₃' },
            { wavelength: 1400, intensity: 290 },
            { wavelength: 1600, intensity: 190 },
          ],
          keyFindings: [
            'Presencia confirmada de minerales arcillosos formados por interacción persistente con agua líquida alcalina.',
            'Baja oxidación profunda que favorece la preservación de hipotéticas biofirmas fósiles.',
          ],
        },
        nasaResearchSource: {
          repository: 'NASA OSDR',
          recordId: 'OSDR-00412 / NASA PDS-GEO',
          title: 'Perchlorate-Resistant Halophiles & Organic Biosignature Preservation in Martian Regolith',
          url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSDR-412',
          realWorldFact:
            'En Marte, el perclorato (ClO₄⁻) en el suelo actúa como anticongelante bajando el punto de congelación del agua a -70 °C, pero oxida compuestos orgánicos en análisis térmicos.',
        },
        physicalConstraints: [
          {
            title: 'Latencia por Velocidad de la Luz (One-Way Light Time)',
            impact: 'Cada comando transmitido desde el Centro de Control tarda 14.2 minutos en alcanzar Marte.',
            engineeringMitigation:
              'El rover ejecuta algoritmos de visión estéreo y navegación autónoma por cuadrículas sin esperar comandos humanos en tiempo real.',
          },
          {
            title: 'Atenuación Solar por Tormentas de Polvo Globales',
            impact: 'La dispersión de radiación por partículas suspendidas reduce la potencia de los paneles circulares.',
            engineeringMitigation:
              'Inclinación de paneles según acimut solar y apagado automático de calefactores secundarios durante la noche marciana.',
          },
        ],
      };
    } else if (payloadId === 'payload-radar-atmosferico') {
      return {
        missionId,
        missionName: 'Misión Mars 2026: Explorador Marciano',
        destination: 'Marte (Planicie de Isidis)',
        payloadUsed: 'Espectrómetro de Masas Cuadrupolar y Radar Subsuperficial (SHARAD/RIMFAX)',
        primaryDiscovery: 'Detección de lente de hielo subterráneo con constante dieléctrica ε = 3.1 a 14 metros de profundidad.',
        summary:
          'El radar de penetración terrestre emitió pulsos polarizados de 15 a 25 MHz a través de la regolita de Isidis, revelando un estrato reflector nítido consistente con un depósito de hielo de agua reliquia preservado bajo sedimentos eólicos.',
        commsLatencySec: 852,
        commsLatencyFormatted: '14 min 12 s (Ida)',
        environmentConditions: {
          temperature: '-58.4 °C (214.75 K)',
          pressure: '612 Pa (0.006 atm)',
          radiation: '0.64 mGy / día',
          solarFlux: '412 W/m²',
        },
        instrumentReadings: [
          {
            id: 'dielectric-const',
            name: 'Constante Dieléctrica Relativa (ε)',
            category: 'Geofísica de Radar',
            value: '3.12',
            unit: 'εᵣ',
            status: 'optimal',
            nasaReference: 'SHARAD MRO PDS Sounder Volume 34',
            description: 'Compatible con mezcla 85% hielo de agua y 15% polvo basáltico.',
          },
          {
            id: 'radar-depth',
            name: 'Profundidad de Penetración del Pulso',
            category: 'Sondeo Subterráneo',
            value: '22.6',
            unit: 'm',
            status: 'nominal',
            nasaReference: 'RIMFAX Perseverance Subsurface Radar',
            description: 'Retorno de eco nítido sin atenuación dispersiva excesiva.',
          },
          {
            id: 'atmos-co2',
            name: 'Composición Atmosférica CO₂',
            category: 'Espectrometría Cuadrupolar',
            value: '95.32',
            unit: '% vol',
            status: 'nominal',
            nasaReference: 'SAM (Sample Analysis at Mars) QMS Suite',
            description: 'Nivel estándar marciano, con 2.6% N₂ y 1.9% Ar-40.',
          },
        ],
        spectralData: {
          title: 'Perfil Radargrama de Reflexión Dieléctrica Subsuperficial',
          xAxisLabel: 'Profundidad Calculada (Metros bajo superficie)',
          yAxisLabel: 'Amplitud de Retorno de Potencia (dB)',
          points: [
            { wavelength: '0m', intensity: 950, label: 'Reflexión de Superficie' },
            { wavelength: '3m', intensity: 410, label: 'Sedimento eólico suelto' },
            { wavelength: '7m', intensity: 280, label: 'Lava basáltica porosa' },
            { wavelength: '14m', intensity: 880, label: 'Interfaz Lente de Hielo Reliquia', compound: 'H₂O Ice (ε=3.1)' },
            { wavelength: '18m', intensity: 520, label: 'Base del estrato criogénico' },
            { wavelength: '25m', intensity: 160, label: 'Lecho rocoso Noeico' },
          ],
          keyFindings: [
            'Volumen estimado de hielo suficiente para abastecer futuras misiones tripuladas de conversión de combustible ISRU.',
            'Capa superior de 14 metros de roca y polvo actúa como escudo térmico y radiativo natural.',
          ],
        },
        nasaResearchSource: {
          repository: 'NASA PDS',
          recordId: 'PDS-GEO: MRO-M-SHARAD-5-RADARGRAM-V1.0',
          title: 'Subsurface Radar Sounding of Isidis and Utopia Planitia Ice Deposits',
          url: 'https://pds-geosciences.wustl.edu/missions/mro/sharad.htm',
          realWorldFact:
            'SHARAD de la NASA utiliza ondas de radio que viajan a la velocidad de la luz en el vacío, pero se ralentizan según la constante dieléctrica del material subterráneo.',
        },
        physicalConstraints: [
          {
            title: 'Dispersión y Absorción de Señal de Radio en Regolita Salina',
            impact: 'Minerales de sulfatos húmedos absorben ondas de radio impidiendo ver más allá de 50 metros.',
            engineeringMitigation:
              'Transmisión en modulación de frecuencia modulada continua (FMCW) de 15 a 25 MHz para máxima penetración.',
          },
          {
            title: 'Presión Crítica en el Punto Triple del Agua (611 Pa)',
            impact: 'La presión atmosférica de 612 Pa está justo en el límite donde el agua líquida hierve o se sublima casi al instante.',
            engineeringMitigation:
              'Cualquier extracción de hielo debe realizarse en recipientes presurizados autónomos.',
          },
        ],
      };
    } else {
      return {
        missionId,
        missionName: 'Misión Mars 2026: Explorador Marciano',
        destination: 'Marte (Planicie de Isidis)',
        payloadUsed: 'Telescopio Espacial Mini-Infrarrojo y Radiómetro de Aerosoles',
        primaryDiscovery: 'Cartografía de vapor de agua atmosférico y trazado de condensación en mesetas volcánicas.',
        summary:
          'Observaciones multiespectrales en el rango de 1.2 a 2.5 µm midieron la columna integrada de vapor de agua (8 a 14 micrones precipitables) y la tasa de foto-disociación por radiación UV solar no filtrada.',
        commsLatencySec: 852,
        commsLatencyFormatted: '14 min 12 s (Ida)',
        environmentConditions: {
          temperature: '-58.4 °C (214.75 K)',
          pressure: '612 Pa (0.006 atm)',
          radiation: '0.64 mGy / día',
          solarFlux: '412 W/m²',
        },
        instrumentReadings: [
          {
            id: 'h2o-column',
            name: 'Vapor de Agua Precipitable en Columna',
            category: 'Astrometría Planetaria',
            value: '11.8',
            unit: 'pr. µm',
            status: 'nominal',
            nasaReference: 'CRISM / MRO Science Archives',
            description: 'Picos diurnos por sublimación térmica de los casquetes polares.',
          },
          {
            id: 'aerosol-size',
            name: 'Radio Efectivo de Aerosoles de Polvo',
            category: 'Óptica Atmosférica',
            value: '1.45',
            unit: 'µm',
            status: 'nominal',
            nasaReference: 'Mastcam-Z Calibration Dataset 2024',
            description: 'Grano micro-fino que dispersa selectivamente la luz solar (atardeceres azules).',
          },
        ],
        spectralData: {
          title: 'Transmitancia Atmosférica Infrarroja de Isidis Planitia',
          xAxisLabel: 'Longitud de Onda (µm)',
          yAxisLabel: 'Transmitancia Relativa (%)',
          points: [
            { wavelength: '1.0µm', intensity: 88, label: 'Ventana óptica' },
            { wavelength: '1.4µm', intensity: 22, label: 'Banda de Absorción H₂O', compound: 'H₂O Vapor' },
            { wavelength: '1.9µm', intensity: 48, label: 'Minerales hidratados' },
            { wavelength: '2.0µm', intensity: 12, label: 'Banda fuerte CO₂', compound: 'CO₂ Atmosférico' },
            { wavelength: '2.4µm', intensity: 82, label: 'Ventana de sondeo' },
          ],
          keyFindings: [
            'El flujo solar ultravioleta sin capa de ozono destruye el vapor de agua en iones H⁺ que escapan al espacio.',
            'La atmósfera actúa como una lente delgada para longitudes de onda infrarrojas cortas.',
          ],
        },
        nasaResearchSource: {
          repository: 'NASA PDS',
          recordId: 'PDS-ATM: MEX-M-SPICAM-3-EXT1-V1.0',
          title: 'Ultraviolet and Infrared Atmospheric Sensor Observations of Martian Clouds and Ozone',
          url: 'https://pds-atmospheres.nmsu.edu/',
          realWorldFact:
            'A diferencia de la Tierra, en Marte la falta de ozono estratosférico permite que la luz solar UV rompa directamente las moléculas de agua en la alta atmósfera.',
        },
        physicalConstraints: [
          {
            title: 'Acumulación de Polvo Electrostático en Lentes Ópticas',
            impact: 'El polvo marciano rico en óxido de hierro tiene carga triboeléctrica y se adhiere fuertemente al vidrio.',
            engineeringMitigation:
              'Revestimiento hidrofóbico con electrodos de onda viajera piezoeléctrica para autolimpieza.',
          },
          {
            title: 'Contracción Térmica Diurna (Gradiente ΔT > 80 °C)',
            impact: 'La expansión y contracción descalibra los ejes del telescopio si no se compensa.',
            engineeringMitigation:
              'Estructura de fibra de carbono con coeficiente de dilatación térmica casi nulo (ZODIAC).',
          },
        ],
      };
    }
  }

  if (missionId === 'artemis-lunar') {
    return {
      missionId,
      missionName: 'Misión Artemis IV: Órbita Lunar',
      destination: 'La Luna (Órbita NRHO - Cuenca Aitken)',
      payloadUsed:
        payloadId === 'payload-rover-autonomo'
          ? 'Explorador Geológico y Espectrómetro Polar de Regolito'
          : payloadId === 'payload-radar-atmosferico'
            ? 'Radar Mini-RF de Polarización Circular y Espectrómetro Exosférico'
            : 'Telescopio Polar Criogénico de Espacio Profundo',
      primaryDiscovery: 'Firma de hielo de agua en Regiones de Sombra Permanente (PSR) con CPR > 1.25.',
      summary:
        'Desde la órbita de halo casi rectilínea (NRHO), la nave Orión y el módulo ESM apuntaron sus sensores hacia los cráteres Shackleton y Faustini en el Polo Sur Lunar. Los datos de radar bi-estático confirman depósitos estratificados de regolito enriquecido en volátiles e hidrógeno.',
      commsLatencySec: 1.28,
      commsLatencyFormatted: '1.28 segundos (Ida)',
      environmentConditions: {
        temperature: '40 K (-233.15 °C) en PSR / +120 °C bajo Sol directo',
        pressure: '10⁻¹⁰ Pa (Vacío ultra-alto lunar)',
        radiation: '1.36 mSv / día (Flujo de rayos cósmicos sin magnetosfera)',
        solarFlux: '1361 W/m² (Constante solar en la órbita lunar)',
      },
      instrumentReadings: [
        {
          id: 'cpr-polarization',
          name: 'Relación de Polarización Circular (CPR)',
          category: 'Radar de Apertura Sintética',
          value: '1.38',
          unit: 'Ratio',
          status: 'optimal',
          nasaReference: 'Mini-RF / Lunar Reconnaissance Orbiter (LRO)',
          description: 'Valores > 1.0 demuestran dispersión de coherencia de volumen en hielo de agua puro.',
        },
        {
          id: 'cryo-boiloff',
          name: 'Tasa de Evaporación Criogénica (Boil-Off)',
          category: 'Propulsión de Servicio ESM',
          value: '0.076',
          unit: '% / día',
          status: 'nominal',
          nasaReference: 'Cryogenic Fluid Management (CFM) Technology',
          description: 'Aislamiento multicapa (MLI) mantiene LOX y metano estables en órbita de 6.5 días.',
        },
        {
          id: 'laser-downlink',
          name: 'Enlace Óptico Láser Tierra-Luna (O2O)',
          category: 'Telecomunicaciones Cuánticas',
          value: '260',
          unit: 'Mbps',
          status: 'optimal',
          nasaReference: 'Orion Artemis II/IV Optical Communications System',
          description: 'Transmisión de telemetría científica en tiempo real hacia White Sands, Nuevo México.',
        },
        {
          id: 'h-abundance',
          name: 'Equivalente de Agua por Neutrones Epitérmicos',
          category: 'Espectrometría Nuclear',
          value: '5.6',
          unit: '% masa H₂O',
          status: 'optimal',
          nasaReference: 'LEND (Lunar Exploration Neutron Detector)',
          description: 'Concentración de hidrógeno elemental atrapado en trampas frías de la Cuenca Aitken.',
        },
      ],
      spectralData: {
        title: 'Firma Térmica y de Brillo de Hielo Polar (Cráter Faustini)',
        xAxisLabel: 'Profundidad en Trampa Fría (cm)',
        yAxisLabel: 'Reflectancia Normalizada / CPR',
        points: [
          { wavelength: '0cm', intensity: 210, label: 'Regolito superficial deshidratado' },
          { wavelength: '15cm', intensity: 480, label: 'Inicio de permafrost lunar' },
          { wavelength: '30cm', intensity: 820, label: 'Capa rica en granos de hielo', compound: 'H₂O Ice (5.6% masa)' },
          { wavelength: '50cm', intensity: 940, label: 'Depósito masivo de volátiles', compound: 'H₂O + CO₂ congelados' },
          { wavelength: '80cm', intensity: 780, label: 'Mezcla anortosítica compactada' },
        ],
        keyFindings: [
          'El hielo en los polos lunares se ha acumulado por impactos de cometas a lo largo de 2 mil millones de años.',
          'Las reservas son suficientes para producir propulsor criogénico (LOX/LH₂) in situ en la futura base Artemis.',
        ],
      },
      nasaResearchSource: {
        repository: 'NASA OSDR',
        recordId: 'OSDR-00329 / NASA LRO Diviner',
        title: 'Lunar Deep Space Radiation Environment and Microdosimetry on Biological Systems',
        url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSDR-329',
        realWorldFact:
          'En las regiones de sombra permanente del Polo Sur Lunar, la temperatura baja a 40 Kelvin (-233 °C), convirtiéndolas en uno de los lugares más fríos del Sistema Solar, incluso más frío que Plutón.',
      },
      physicalConstraints: [
        {
          title: 'Gradiente Térmico Extremo (+120 °C a -233 °C)',
          impact: 'La transición abrupta entre luz solar directa y la sombra de los cráteres fractura componentes metálicos.',
          engineeringMitigation:
            'Tuberías de calor de bucle bombeado y mantas de aerogel de sílice en los módulos de instrumentos.',
        },
        {
          title: 'Abrasión por Regolito Lunar Electroestático',
          impact: 'Sin atmósfera, el viento solar carga positivamente el polvo de vidrio lunar que raya ópticas y sellos.',
          engineeringMitigation:
            'Pantallas de descarga electrostática y recubrimientos de diamante policristalino en juntas.',
        },
      ],
    };
  }

  return {
    missionId,
    missionName: 'Misión Observatorio Lagrange L2',
    destination: 'Punto de Lagrange Sol-Tierra L2 (1,500,000 km)',
    payloadUsed:
      payloadId === 'payload-mini-telescopio'
        ? 'Telescopio Mini-Infrarrojo de 18 Espejos de Berilio Chapados en Oro'
        : payloadId === 'payload-radar-atmosferico'
          ? 'Espectrómetro Cuadrupolar y Detector de Viento Solar Interplanetario'
          : 'Sistema Robótico de Calibración de Escudo Térmico',
    primaryDiscovery: 'Detección de vapor de agua y dióxido de carbono en la atmósfera del exoplaneta WASP-96b.',
    summary:
      'Posicionado en la órbita de halo de L2, el observatorio desplegó su parasol de 5 capas de Kapton aluminizado. Protegido del resplandor térmico de la Tierra y el Sol, el sensor criogénico analizó la luz de una estrella lejana filtrada por la atmósfera de un planeta extrasolar.',
    commsLatencySec: 5.0,
    commsLatencyFormatted: '5.0 segundos (Ida)',
    environmentConditions: {
      temperature: 'Lado Caliente: +85.2 °C (358 K) | Lado Frío Científico: -235.9 °C (37.2 K)',
      pressure: '0 Pa (Vacío interestelar profundo)',
      radiation: '0.98 mSv / día (Viento solar directo sin amortiguación magnética)',
      solarFlux: 'Lado Sol: 1350 W/m² | Lado Espejo: < 0.0001 W/m²',
    },
    instrumentReadings: [
      {
        id: 'cold-temp',
        name: 'Temperatura del Detector Infrarrojo',
        category: 'Criogenia de Instrumentos',
        value: '37.2',
        unit: 'K (-235.95 °C)',
        status: 'optimal',
        nasaReference: 'JWST NIRCam / MIRI Cryocooler Telemetry',
        description: 'Enfriamiento pasivo radiativo por debajo del umbral de ruido térmico intrínseco.',
      },
      {
        id: 'sunshield-gradient',
        name: 'Gradiente Térmico a través de las 5 Capas',
        category: 'Control Térmico',
        value: '321',
        unit: 'K de ΔT',
        status: 'optimal',
        nasaReference: 'JWST Sunshield Deployment Engineering Data',
        description: 'Cada capa de Kapton con revestimiento de silicio dopado desvía el 99.9% del calor solar.',
      },
      {
        id: 'redshift-z',
        name: 'Corrimiento al Rojo Fotométrico Detectado',
        category: 'Cosmología Observacional',
        value: 'z = 13.2',
        unit: 'Redshift',
        status: 'optimal',
        nasaReference: 'JADES (JWST Advanced Deep Extragalactic Survey)',
        description: 'Luz emitida hace más de 13.400 millones de años, apenas 320 millones tras el Big Bang.',
      },
      {
        id: 'dsn-snr',
        name: 'Margen de Señal DSN (Red del Espacio Profundo)',
        category: 'Telemetría Banda Ka',
        value: '18.4',
        unit: 'dB SNR',
        status: 'nominal',
        nasaReference: 'NASA Deep Space Network 70m Antennas (Madrid/Goldstone)',
        description: 'Pérdida por distancia de 1.5 millones de km compensada por amplificador TWT de 80W.',
      },
    ],
    spectralData: {
      title: 'Espectro de Transmisión Atmosférica Exoplanetaria (NIRSpec)',
      xAxisLabel: 'Longitud de Onda Infrarroja (µm)',
      yAxisLabel: 'Profundidad de Tránsito (ppm)',
      points: [
        { wavelength: '0.8µm', intensity: 1180, label: 'Dispersión Rayleigh' },
        { wavelength: '1.1µm', intensity: 1240 },
        { wavelength: '1.4µm', intensity: 1460, label: 'Banda de Vapor de Agua', compound: 'H₂O molecular' },
        { wavelength: '1.8µm', intensity: 1210 },
        { wavelength: '2.7µm', intensity: 1390, label: 'Absorción H₂O secundaria' },
        { wavelength: '4.3µm', intensity: 1680, label: 'Pico marcado de Dióxido de Carbono', compound: 'CO₂ gaseoso' },
        { wavelength: '5.0µm', intensity: 1290, label: 'Monóxido de Carbono', compound: 'CO' },
      ],
      keyFindings: [
        'Primera detección confirmada de dióxido de carbono claro en un planeta que orbita una estrella de tipo solar.',
        'La relación C/O sugiere una formación por acreción de guijarros de hielo lejos de la estrella madre.',
      ],
    },
    nasaResearchSource: {
      repository: 'NASA MAST / STScI',
      recordId: 'MAST: JWST-PROGRAM-01366 / OSDR-00184',
      title: 'Transmission Spectroscopy of Giant Gas Exoplanets and Deep Space Genomic Radioprotection',
      url: 'https://archive.stsci.edu/missions-and-data/jwst',
      realWorldFact:
        'El punto de Lagrange L2 orbita al Sol al mismo tiempo que la Tierra gracias al equilibrio combinado de la gravedad terrestre y solar, lo que permite al parasol dar la espalda al Sol y la Tierra permanentemente.',
    },
    physicalConstraints: [
      {
        title: 'Presión de Radiación Solar Asimétrica en el Parasol',
        impact: 'Los fotones solares empujan el escudo de 21x14 metros generando un torque continuo.',
        engineeringMitigation:
          'Aleta compensadora de momento solar en la popa de la nave y ruedas de reacción con desaturación periódica.',
      },
      {
        title: 'Atenuación de Señal en Espacio Profundo (Ley de la Inversa del Cuadrado)',
        impact: 'A 1.5 millones de kilómetros, la intensidad de la señal de radio cae a una billonésima parte de un vatio.',
        engineeringMitigation:
          'Antenas parabólicas criogénicas de 70 metros de la Red de Espacio Profundo (DSN) con receptores máser enfriados por helio líquido.',
      },
    ],
  };
}

export function getMissionScienceReport(
  missionId: string,
  payloadId: string,
  stats: MissionStats,
  challengeResult?: DestinationChallengeResult,
  lang: Language = 'es'
): ScienceReportData {
  const report = buildRawMissionScienceReport(missionId, payloadId, stats, lang);
  if (!challengeResult) return report;

  report.challengeResult = challengeResult;

  if (!challengeResult.achieved) {
    if (lang === 'en') {
      report.primaryDiscovery = `⚠️ [DEGRADED DATA / COMPROMISED SNR]: ${report.primaryDiscovery}`;
      report.summary = `MISSION CONTROL ALERT: ${challengeResult.notes} ${report.summary}`;
      report.spectralData.title = `${report.spectralData.title} (Incomplete Signal - SNR < 2.5)`;
      report.spectralData.points = report.spectralData.points.map((pt, i) => ({
        ...pt,
        intensity: Math.max(120, Math.round(pt.intensity * 0.45 + (i % 2 === 0 ? 95 : -85))),
        label: pt.label ? `${pt.label} (Unverified)` : undefined,
      }));
      report.spectralData.keyFindings = [
        'TECHNICAL WARNING: Acquisition did not achieve nominal resolution or NASA OSDR signal-to-noise thresholds.',
        `Logged telemetry: ${challengeResult.telemetrySummary}`,
        'Operational recommendation: Repeat the 3D maneuver or optical phasing to unlock 100% science fidelity.',
      ];
      if (report.instrumentReadings.length > 0) {
        report.instrumentReadings[0] = {
          ...report.instrumentReadings[0],
          status: 'warning',
          description: `Sub-optimal acquisition due to mission state: ${challengeResult.telemetrySummary}`,
        };
      }
    } else {
      report.primaryDiscovery = `⚠️ [DATOS DEGRADADOS / RELACIÓN SEÑAL-RUIDO COMPROMETIDA]: ${report.primaryDiscovery}`;
      report.summary = `ALERTA DE CONTROL DE MISIÓN: ${challengeResult.notes} ${report.summary}`;
      report.spectralData.title = `${report.spectralData.title} (Señal Incompleta - SNR < 2.5)`;
      report.spectralData.points = report.spectralData.points.map((pt, i) => ({
        ...pt,
        intensity: Math.max(120, Math.round(pt.intensity * 0.45 + (i % 2 === 0 ? 95 : -85))),
        label: pt.label ? `${pt.label} (No verificado)` : undefined,
      }));
      report.spectralData.keyFindings = [
        'ADVERTENCIA TÉCNICA: La adquisición no alcanzó la resolución nominal ni la relación señal/ruido requerida por NASA OSDR.',
        `Telemetría registrada: ${challengeResult.telemetrySummary}`,
        'Recomendación operativa: Repetir la maniobra o calibración en el entorno 3D para desbloquear el 100% de la precisión científica.',
      ];
      if (report.instrumentReadings.length > 0) {
        report.instrumentReadings[0] = {
          ...report.instrumentReadings[0],
          status: 'warning',
          description: `Adquisición sub-óptima por condición operativa: ${challengeResult.telemetrySummary}`,
        };
      }
    }
  } else {
    report.primaryDiscovery =
      lang === 'en'
        ? `⭐ [NASA OSDR CERTIFIED / 100% OPTIMAL]: ${report.primaryDiscovery}`
        : `⭐ [CERTIFICACIÓN NASA OSDR / 100% ÓPTIMO]: ${report.primaryDiscovery}`;
  }

  return report;
}
