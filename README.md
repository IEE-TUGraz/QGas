<!--![QGas logo](QGAS_Logo.png)-->
<div align="justify">

# QGas – Interactive Gas Infrastructure Tool
QGas is an interactive tool for **visualizing**, **exploring**, and **adapting** the most comprehensive open-source dataset on European gas infrastructure to date.
It collects and harmonizes publicly available data and employs machine learning to approximate missing network data.
The resulting dataset is designed for **integrated energy system modeling**, providing a consistent foundation for gas-power sector coupling analyses and energy transition research.

More specifically, the QGas dataset combines the **georeferenced European gas network topology** derived from the [ENTSOG Transparency Map](link) with additional data from multiple open sources:

- **Pipelines:** [OpenStreetMap](https://www.openstreetmap.org) (OSM) and [Global Energy Monitor](https://globalenergymonitor.org/projects/global-gas-infrastructure-tracker/) (GEM) 
- **Compressor stations:** Compiled through targeted research
- **Gas storage facilities:** [Gas Infrastructure Europe](https://transparency.gie.eu/) (GIE)
- **Gas-fired power plants:** [PyPSA powerplantmatching](https://github.com/PyPSA/powerplantmatching)  
- **LNG terminals:** [Global Energy Monitor](https://globalenergymonitor.org/projects/global-gas-infrastructure-tracker/)
- **Demand time series:** Compiled through targeted research


# Philosophy
QGas is a community-driven project that aims to provide a reliable and transparent database to support informed decision-making in the energy transition.
To achieve this, QGas is designed for the **straightforward addition and adaption of infrastructure and corresponding data** through an intuitive drag-and-drop interface.
This approach enables gas experts from both academia and industry to verify the dataset, contribute their knowledge, and help continuously improve its quality.

The QGas project is maintained by the [Institute of Electricity Economics and Energy Innovation](https://www.tugraz.at/en/institutes/iee/home) of [Graz University of Technology](https://www.tugraz.at/en/home). Contributers are listed [below](https://github.com/IEE-TUGraz/QGas/edit/main/README.md#contributers).


# Features
**Updateable:** QGas automatically collects and harmonizes pipeline data – including route, name, diameter, pressure, and other attributes – from OSM and GEM, and maps it to the corresponding pipelines in the ENTSOG network topology using an **overlap-length–based matching procedure**. As these open data sources continuously grow, the data quality within QGas improves over time.

**Machine learning:** QGas employs **network-topology–informed machine learning** to approximate missing pipeline diameters by classifying pipelines into discrete diameter categories.
As more data become available, the classification accuracy improves accordingly.

**Verification:** The interactive QGas interface enables gas experts from both academia and industry to review and verify the dataset and contribute their domain knowledge.
Once verified, data are excluded from the automatic collection and matching procedures to preserve expert input.

**Functionality:** What sets QGas apart from other databases is its ability to **visually add and modify infrastructure and corresponding data** (no need for data wrangling in tables). Users can intuitively add, remove, split, reroute, or connect pipelines, as well as edit other infrastructure such as gas-fired power plants, storage facilities, and biogas producers.
In the background, QGas automatically creates, aggregates, and renames connections (nodes) to maintain network consistency.



# Requirements


# Documentation
Detailed documentation for QGas is available [here](link-to-pdf-doc).


# Cite
If you use QGas in your research or work, please cite the following paper:

The authors, "QGas," journal, issue, pages, year. DOI.

    @article{QGAS,
       author = {A1 and A2 and A3},
       title = {{QGas}},
       journal = {journal},
       volume = {x},
       issue = {x},
       number = {x},
       year = {yyyy},
       doi = {doi}
    }


# License


# Acknowledgements


# Contributors

<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="9.5%"><a href="https://github.com/Mquan07-M"><img src=https://avatars.githubusercontent.com/u/200053250?v=4 width="100px;" alt="Marco Quantschnig"/><br /><sub><b>Marco Quantschnig</b>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tklatzer"><img src="https://avatars.githubusercontent.com/u/85995327?v=4" width="100px;" alt="Thomas Klatzer"/><br /><sub><b>Thomas Klatzer</b>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yannickwerner"><img src="https://avatars.githubusercontent.com/u/50335568?v=4" width="100px;" alt="Yannick Werner"/><br /><sub><b>Yannick Werner</b>
  </tbody>
</table>


</div>
