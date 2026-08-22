# 📊 Dynamiczny Monitor Zamówień (Dynamic Order Monitor)

Aplikacja zaprojektowana do optymalizacji procesu wprowadzania zamówień i rygorystycznego monitorowania terminów realizacji.

## 🎯 Cel projektu (Business Value)
Narzędzie powstało z myślą o ułatwieniu codziennej pracy koordynatorów projektów, planistów i działów sprzedaży. Rozwiązuje realne problemy występujące na styku planowania i logistyki: automatyzuje śledzenie statusów, eliminuje wąskie gardła informacyjne i zapobiega przekroczeniom terminów realizacji. 

## ✨ Główne funkcje
* **Zarządzanie zamówieniami:** Szybkie i usystematyzowane wprowadzanie nowych zleceń.
* **Monitorowanie terminów:** Bieżące śledzenie czasu realizacji i identyfikacja zagrożonych projektów.
* **Dynamiczna kontrola harmonogramu::** Wbudowany mechanizm weryfikujący terminy realizacji na podstawie aktualnych danych, pomagający zapobiegać wąskim gardłom i opóźnieniom.
* **Bezpieczna baza danych:** Przechowywanie informacji o zleceniach z wykorzystaniem Firebase.

## 🛠 Technologie
* **Język / Framework:** Python
* **AI:** Google Gemini API (AI Studio)
* **Baza danych:** Firebase
* **Zarządzanie środowiskiem:** pliki `.env` oraz `.gitignore` dla pełnego bezpieczeństwa kluczy dostępu.

## 🚀 Instalacja i uruchomienie (Dla deweloperów)
1. Sklonuj repozytorium: `git clone https://github.com/TwojaNazwaUzytkownika/dynamic-order-monitor.git`
2. Zainstaluj wymagane biblioteki (np. z pliku `requirements.txt`).
3. Utwórz plik `.env` w głównym katalogu projektu i dodaj swój klucz API:
   `GEMINI_API_KEY=twoj_klucz_tutaj`
4. Upewnij się, że plik `firebase-applet-config.json` z kluczami bazy danych znajduje się w głównym folderze (plik ten jest ignorowany przez `.gitignore`).

---

# 🇬🇧 English Version

An application designed to optimize the order entry process and rigorously monitor delivery deadlines.

## 🎯 Project Objective
This tool was built to streamline the daily operations of project coordinators, planners, and sales teams. It solves real-world challenges in planning and logistics by automating status tracking, eliminating communication bottlenecks, and proactively preventing deadline overruns.

## ✨ Key Features
* **Order Management:** Fast and structured registration of new orders.
* **Deadline Tracking:** Real-time monitoring of delivery schedules and identification of at-risk projects.
* **Dynamic Schedule Monitoring:** A built-in mechanism that verifies completion dates based on current data, helping to prevent bottlenecks and delays.
* **Secure Database:** Reliable data storage using Firebase.

## 🛠 Tech Stack
* **Language:** Python
* **AI:** Google Gemini API
* **Database:** Firebase
* **Security:** `.env` and `.gitignore` implementation to secure API keys and database configuration.
