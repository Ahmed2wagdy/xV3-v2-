import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-bot.component.html',
  styleUrls: ['./chat-bot.component.css']
})
export class ChatBotComponent implements OnInit {
  messages: ChatMessage[] = [];
  newMessage: string = '';
  
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      // User is not authenticated, redirect to login page
      Swal.fire({
        icon: 'warning',
        title: 'Authentication Required',
        text: 'Please log in to access this page',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        this.router.navigate(['/log-in']);
      });
      return;
    }
    
    // Initial bot messages
    this.addBotMessage('Hello! I\'m your X-Rental assistant. How can I help you today?');
    this.addBotMessage('You can ask me about properties, rental process, or any other questions you have.');
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    
    // Add user message
    this.messages.push({
      content: this.newMessage,
      isUser: true,
      timestamp: new Date()
    });
    
    const userQuery = this.newMessage.toLowerCase();
    this.newMessage = '';
    
    // Simulate bot response
    setTimeout(() => {
      let botResponse = '';
      
      if (userQuery.includes('property') || userQuery.includes('properties')) {
        botResponse = 'We have various properties available. You can browse them in the dashboard or use the search filters to find specific types.';
      } else if (userQuery.includes('rent') || userQuery.includes('rental')) {
        botResponse = 'Our rental process is simple: Find a property you like, schedule a visit, and if you decide to proceed, we\'ll help with the paperwork.';
      } else if (userQuery.includes('price') || userQuery.includes('cost')) {
        botResponse = 'Property prices vary depending on location, size, and features. You can see the price of each property on its card.';
      } else if (userQuery.includes('location') || userQuery.includes('area')) {
        botResponse = 'We have properties in various locations across Cairo, including El-Sherouk, Maadi, and other popular areas.';
      } else if (userQuery.includes('hi') || userQuery.includes('hello')) {
        botResponse = 'Hello there! How can I assist you with your property search today?';
      } else {
        botResponse = 'I\'m sorry, I\'m still learning. Could you ask me about our properties, rental process, or contact information?';
      }
      
      this.addBotMessage(botResponse);
    }, 1000);
  }
  
  addBotMessage(content: string): void {
    this.messages.push({
      content,
      isUser: false,
      timestamp: new Date()
    });
  }
  
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}